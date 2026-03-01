using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Data.Sqlite;
using System.Data.Common;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Metadata;

namespace MainFunctions.Services
{
    public static class DbPatcher
    {
        private static readonly string LogPath = Path.Combine(AppContext.BaseDirectory, "logs");
        private static readonly string LogFile = Path.Combine(LogPath, "dbpatcher.log");
        private const long MaxLogSizeBytes = 5 * 1024 * 1024; // 5 MB

        // External logger can be set by the host app
        public static ILogger? Logger { get; set; }

        /// <summary>
        /// Applies any pending EF Core migrations to the provided context.
        /// By default this is a best-effort operation: exceptions are logged but not thrown.
        /// Set <paramref name="throwOnError"/> to true to let exceptions propagate.
        /// </summary>
        public static async Task EnsureObligationSchema(AppDbContext? db, bool throwOnError = false)
        {
            if (db == null) return;
            try
            {
                // Run diagnostics and attempt safe repair before migrations
                try
                {
                    var diag = await DiagnoseSchemaAsync(db);
                    Logger?.LogInformation("Schema diagnostic:\n{Diag}", diag.Report);
                    if (diag.MissingColumns.Count > 0)
                    {
                        Logger?.LogInformation("Attempting to repair {Count} missing columns", diag.MissingColumns.Count);
                        await RepairMissingColumnsAsync(db, diag.MissingColumns);
                    }
                }
                catch (Exception dex)
                {
                    Logger?.LogWarning(dex, "Schema diagnostic/repair failed (non-fatal)");
                }

                // Try to ensure shadow concurrency columns exist for existing tables before running migrations.
                try { await EnsureShadowColumnsAsync(db); } catch (Exception se) { Logger?.LogDebug(se, "EnsureShadowColumnsAsync failed (non-fatal)"); }

                await db.Database.MigrateAsync();
                Logger?.LogInformation("EnsureObligationSchema: migrations applied for DB: {Db}", db.Database.GetDbConnection()?.Database);

                // After migrations, ensure shadow columns again in case migrations created tables without the shadow column due to provider differences
                try { await EnsureShadowColumnsAsync(db); } catch (Exception se) { Logger?.LogDebug(se, "EnsureShadowColumnsAsync post-migrate failed (non-fatal)"); }
            }
            catch (Exception ex)
            {
                try
                {
                    // If this is a SQLite "already exists" or duplicate-column error, treat it as non-fatal.
                    // This can happen if the DB schema was partially created outside of migrations or a runtime repair added a column.
                    if (IsSqliteAlreadyExistsError(ex))
                    {
                        Logger?.LogWarning(ex, "EnsureObligationSchema: SQLite reported object already exists or duplicate column - attempting repair and ignoring migration error");
                        try { await EnsureShadowColumnsAsync(db); } catch { }
                        return;
                    }

                    LogError("EnsureObligationSchema", ex);
                    Logger?.LogError(ex, "EnsureObligationSchema failure");
                }
                catch
                {
                    // Logging should never throw; swallow
                }

                if (throwOnError)
                {
                    throw;
                }
            }
        }

        private static async Task<(string Report, List<(string Table, string Column, string ClrType)> MissingColumns)> DiagnoseSchemaAsync(AppDbContext db)
        {
            var sb = new StringBuilder();
            var missing = new List<(string Table, string Column, string ClrType)>();

            var conn = db.Database.GetDbConnection();
            try
            {
                if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();

                // Load DB tables and columns
                var dbTables = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
                using (var tcmd = conn.CreateCommand())
                {
                    tcmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table'";
                    using var tr = await tcmd.ExecuteReaderAsync();
                    while (await tr.ReadAsync())
                    {
                        var tname = tr.IsDBNull(0) ? null : tr.GetString(0);
                        if (tname == null) continue;
                        dbTables[tname] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        using var ccmd = conn.CreateCommand();
                        ccmd.CommandText = $"PRAGMA table_info('{tname}')";
                        using var cr = await ccmd.ExecuteReaderAsync();
                        while (await cr.ReadAsync())
                        {
                            var cname = cr.IsDBNull(1) ? null : cr.GetString(1);
                            if (cname != null) dbTables[tname].Add(cname);
                        }
                    }
                }

                sb.AppendLine("Database tables:");
                foreach (var t in dbTables.Keys) sb.AppendLine(" - " + t);

                sb.AppendLine();

                // Inspect EF model
                sb.AppendLine("EF model tables and properties:");
                foreach (var et in db.Model.GetEntityTypes())
                {
                    // Skip owned types or query types without a table mapping
                    var tableName = et.GetTableName();
                    if (string.IsNullOrEmpty(tableName)) continue;
                    sb.AppendLine("Entity: " + et.Name + " -> Table: " + tableName);

                    // Collect column names expected
                    foreach (var prop in et.GetProperties())
                    {
                        string colName;
                        try
                        {
                            var storeId = StoreObjectIdentifier.Table(tableName, null);
                            colName = prop.GetColumnName(storeId);
                        }
                        catch
                        {
                            colName = prop.Name;
                        }

                        sb.AppendLine("   - " + prop.Name + " => " + colName + " (" + prop.ClrType.Name + ")");

                        if (!dbTables.ContainsKey(tableName) || !dbTables[tableName].Contains(colName))
                        {
                            missing.Add((tableName, colName, prop.ClrType.Name));
                        }
                    }

                    sb.AppendLine();
                }

                if (missing.Count > 0)
                {
                    sb.AppendLine("Missing columns detected:");
                    foreach (var m in missing) sb.AppendLine($" - {m.Table}.{m.Column} ({m.ClrType})");
                }
                else
                {
                    sb.AppendLine("No missing columns detected.");
                }

                return (sb.ToString(), missing);
            }
            finally
            {
                try { await conn.CloseAsync(); } catch { }
            }
        }

        private static async Task RepairMissingColumnsAsync(AppDbContext db, List<(string Table, string Column, string ClrType)> missing)
        {
            if (missing == null || missing.Count == 0) return;

            // Backup DB file if possible
            try
            {
                var conn = db.Database.GetDbConnection();
                var dsn = conn.DataSource;
                if (!string.IsNullOrEmpty(dsn) && File.Exists(dsn))
                {
                    var bak = Path.Combine(Path.GetDirectoryName(dsn) ?? ".", Path.GetFileNameWithoutExtension(dsn) + $"_backup_{DateTime.Now:yyyyMMddHHmmss}" + Path.GetExtension(dsn));
                    File.Copy(dsn, bak, overwrite: false);
                    Logger?.LogInformation("RepairMissingColumnsAsync: database backed up to {Bak}", bak);
                }
            }
            catch (Exception ex)
            {
                Logger?.LogWarning(ex, "RepairMissingColumnsAsync: failed to create DB backup (continuing)");
            }

            var conn2 = db.Database.GetDbConnection();
            try
            {
                if (conn2.State != System.Data.ConnectionState.Open) await conn2.OpenAsync();
                foreach (var m in missing)
                {
                    try
                    {
                        // Only perform safe additions: add nullable columns with a reasonable SQLite type
                        var sqlType = MapClrTypeToSqlite(m.ClrType);
                        if (sqlType == null)
                        {
                            Logger?.LogWarning("Skipping unknown column type for {Table}.{Column} ({ClrType})", m.Table, m.Column, m.ClrType);
                            continue;
                        }

                        var cmd = conn2.CreateCommand();
                        cmd.CommandText = $"ALTER TABLE \"{m.Table}\" ADD COLUMN \"{m.Column}\" {sqlType}";
                        try
                        {
                            await cmd.ExecuteNonQueryAsync();
                            Logger?.LogInformation("RepairMissingColumnsAsync: added column {Table}.{Column} as {Type}", m.Table, m.Column, sqlType);
                        }
                        catch (SqliteException sqe)
                        {
                            // Ignore duplicate/exists errors
                            if (IsSqliteAlreadyExistsError(sqe))
                            {
                                Logger?.LogWarning(sqe, "RepairMissingColumnsAsync: column add conflict for {Table}.{Column}", m.Table, m.Column);
                                continue;
                            }
                            throw;
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger?.LogWarning(ex, "RepairMissingColumnsAsync: failed to add column {Table}.{Column}", m.Table, m.Column);
                    }
                }
            }
            finally
            {
                try { await conn2.CloseAsync(); } catch { }
            }
        }

        private static string? MapClrTypeToSqlite(string clrTypeName)
        {
            // Simple mapping based on CLR type name reported from EF metadata
            // Return a type suitable for ALTER TABLE (nullable by default in SQLite)
            switch (clrTypeName)
            {
                case "String":
                    return "TEXT";
                case "Decimal":
                    return "NUMERIC";
                case "Int32":
                case "Int64":
                case "Boolean":
                    return "INTEGER";
                case "DateTime":
                    return "TEXT";
                case "Byte[]":
                case "Byte[]?":
                    return "BLOB";
                default:
                    return null;
            }
        }

        private static async Task EnsureShadowColumnsAsync(AppDbContext db)
        {
            // Candidate tables that use shadow _concurrencyToken in model configuration/migrations
            var candidates = new[]
            {
                "Projects",
                "Workers",
                "Materials",
                "ProjectWorkers",
                "ProjectMaterials",
                "Payments",
                "PaymentHeaders",
                "PaymentLines",
                "Settlements",
                "Boqs",
                "BoqItems",
                "Attendances",
                "ObligationLines",
                "Suppliers"
            };

            var conn = db.Database.GetDbConnection();
            try
            {
                if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
                using var checkCmd = conn.CreateCommand();

                foreach (var table in candidates)
                {
                    try
                    {
                        // Check if table exists
                        checkCmd.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name=@t";
                        var param = checkCmd.CreateParameter(); param.ParameterName = "@t"; param.Value = table; checkCmd.Parameters.Clear(); checkCmd.Parameters.Add(param);
                        var exists = false;
                        using (var r = await checkCmd.ExecuteReaderAsync())
                        {
                            exists = await r.ReadAsync();
                        }

                        if (!exists) continue;

                        // Check if column exists
                        using var colCmd = conn.CreateCommand();
                        colCmd.CommandText = $"PRAGMA table_info('{table}')";
                        var has = false;
                        using (var rdr = await colCmd.ExecuteReaderAsync())
                        {
                            while (await rdr.ReadAsync())
                            {
                                var name = rdr.IsDBNull(1) ? null : rdr.GetString(1);
                                if (string.Equals(name, "_concurrencyToken", StringComparison.OrdinalIgnoreCase)) { has = true; break; }
                            }
                        }

                        if (has) continue;

                        // Add the nullable BLOB column
                        using var addCmd = conn.CreateCommand();
                        addCmd.CommandText = $"ALTER TABLE \"{table}\" ADD COLUMN \"_concurrencyToken\" BLOB";
                        try
                        {
                            await addCmd.ExecuteNonQueryAsync();
                            Logger?.LogInformation("EnsureShadowColumnsAsync: added _concurrencyToken to {Table}", table);
                        }
                        catch (SqliteException sqe)
                        {
                            // If another process added it concurrently, ignore
                            if (sqe.SqliteErrorCode == 1 && (sqe.Message?.IndexOf("duplicate column", StringComparison.OrdinalIgnoreCase) >= 0 || sqe.Message?.IndexOf("already exists", StringComparison.OrdinalIgnoreCase) >= 0))
                            {
                                Logger?.LogWarning(sqe, "EnsureShadowColumnsAsync: concurrent add of _concurrencyToken for {Table}", table);
                                continue;
                            }
                            throw;
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger?.LogWarning(ex, "EnsureShadowColumnsAsync: failed to ensure column for table {Table}", table);
                    }
                }
            }
            finally
            {
                try { await conn.CloseAsync(); } catch { }
            }
        }

        private static bool IsSqliteAlreadyExistsError(Exception ex)
        {
            // Walk the exception chain and look for a SqliteException or message indicating an existing table/column
            var current = ex;
            while (current != null)
            {
                if (current is SqliteException sqlEx)
                {
                    if (sqlEx.SqliteErrorCode == 1)
                    {
                        var msg = sqlEx.Message ?? string.Empty;
                        if (msg.IndexOf("already exists", StringComparison.OrdinalIgnoreCase) >= 0)
                            return true;
                        if (msg.IndexOf("duplicate column", StringComparison.OrdinalIgnoreCase) >= 0)
                            return true;
                        if (msg.IndexOf("duplicate column name", StringComparison.OrdinalIgnoreCase) >= 0)
                            return true;
                    }
                }

                var text = current.Message ?? string.Empty;
                if (text.IndexOf("already exists", StringComparison.OrdinalIgnoreCase) >= 0)
                    return true;
                if (text.IndexOf("duplicate column", StringComparison.OrdinalIgnoreCase) >= 0)
                    return true;
                if (text.IndexOf("duplicate column name", StringComparison.OrdinalIgnoreCase) >= 0)
                    return true;

                current = current.InnerException;
            }

            return false;
        }

        /// <summary>
        /// Alias for EnsureObligationSchema kept for backward compatibility.
        /// </summary>
        public static Task EnsureWorkerSchema(AppDbContext? db, bool throwOnError = false) => EnsureObligationSchema(db, throwOnError);

        /// <summary>
        /// Compatibility alias used by older callers that expect attendance schema to be ensured.
        /// </summary>
        public static Task EnsureAttendanceSchema(AppDbContext? db, bool throwOnError = false) => EnsureObligationSchema(db, throwOnError);

        /// <summary>
        /// Compatibility alias used by older callers that expect payment schema to be ensured.
        /// </summary>
        public static Task EnsurePaymentSchema(AppDbContext? db, bool throwOnError = false) => EnsureObligationSchema(db, throwOnError);

        /// <summary>
        /// Returns the path to the active dbpatcher log file.
        /// </summary>
        public static string GetLogFilePath() => LogFile;

        /// <summary>
        /// Returns the last <paramref name="lineCount"/> lines from the log file.
        /// </summary>
        public static string[] GetLastLogLines(int lineCount)
        {
            try
            {
                if (!File.Exists(LogFile)) return Array.Empty<string>();
                var allLines = File.ReadAllLines(LogFile);
                if (lineCount <= 0) return Array.Empty<string>();
                if (allLines.Length <= lineCount) return allLines;
                var result = new string[lineCount];
                Array.Copy(allLines, allLines.Length - lineCount, result, 0, lineCount);
                return result;
            }
            catch (Exception ex)
            {
                Logger?.LogWarning(ex, "GetLastLogLines failed");
                return Array.Empty<string>();
            }
        }

        private static void LogError(string operation, Exception ex)
        {
            try
            {
                if (!Directory.Exists(LogPath)) Directory.CreateDirectory(LogPath);

                RotateIfNeeded();

                var sb = new StringBuilder();
                sb.AppendLine("================ DbPatcher Error =================");
                sb.AppendLine(DateTime.Now.ToString("o"));
                sb.AppendLine($"Operation: {operation}");
                sb.AppendLine("Message: " + ex.Message);
                sb.AppendLine("Type: " + ex.GetType());
                sb.AppendLine("StackTrace:");
                sb.AppendLine(ex.StackTrace ?? string.Empty);

                var inner = ex.InnerException;
                while (inner != null)
                {
                    sb.AppendLine("--- Inner Exception ---");
                    sb.AppendLine("Message: " + inner.Message);
                    sb.AppendLine("Type: " + inner.GetType());
                    sb.AppendLine(inner.StackTrace ?? string.Empty);
                    inner = inner.InnerException;
                }

                sb.AppendLine();
                File.AppendAllText(LogFile, sb.ToString());

                // Also write structured log if logger available
                Logger?.LogError(ex, "{Operation} failed: {Message}", operation, ex.Message);
            }
            catch
            {
                // Swallow any logging errors.
            }
        }

        private static void RotateIfNeeded()
        {
            try
            {
                if (!File.Exists(LogFile)) return;
                var fi = new FileInfo(LogFile);
                if (fi.Length <= MaxLogSizeBytes) return;
                var archived = Path.Combine(LogPath, $"dbpatcher_{DateTime.Now:yyyyMMddHHmmss}.log");
                File.Move(LogFile, archived);

                // Simple retention: keep only last 5 archives
                var files = new DirectoryInfo(LogPath).GetFiles("dbpatcher_*.log");
                if (files.Length > 5)
                {
                    Array.Sort(files, (a, b) => a.CreationTimeUtc.CompareTo(b.CreationTimeUtc));
                    for (int i = 0; i < files.Length - 5; i++)
                    {
                        try { files[i].Delete(); } catch { }
                    }
                }
            }
            catch
            {
                // ignore rotation failures
            }
        }
    }
}
