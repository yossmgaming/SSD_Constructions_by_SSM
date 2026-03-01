using System;
using System.Windows;
using MainFunctions.Data;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Services;
using Microsoft.Extensions.Logging;

namespace MainFunctions
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private ILoggerFactory? _loggerFactory;

        protected override async void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Configure simple file logger
            _loggerFactory = LoggerFactory.Create(builder =>
            {
                builder.AddProvider(new FileLoggerProvider("logs/app.log"));
                builder.SetMinimumLevel(LogLevel.Information);
            });

            // Provide logger to DbPatcher so it can emit structured logs
            DbPatcher.Logger = _loggerFactory.CreateLogger("DbPatcher");

            try
            {
                // Always initialize and migrate the local offline database first.
                var factory = new DbContextFactory();
                using (var offlineDb = factory.CreateOfflineDbContext())
                {
                    try
                    {
                        await offlineDb.Database.MigrateAsync();
                    }
                    catch (Exception ex)
                    {
#if DEBUG
                        // In DEBUG, fall back to EnsureCreated to make development convenient
                        try
                        {
                            await offlineDb.Database.EnsureCreatedAsync();
                        }
                        catch
                        {
                            // swallow secondary errors in DEBUG
                        }
#else
                        // In RELEASE, do NOT fallback silently. Log and terminate so issues surface in CI/ops.
                        DbPatcher.Logger?.LogError(ex, "Offline DB migration failed during startup");
                        MessageBox.Show($"Database initialization failed: {ex.Message}\nSee logs for details.", "Startup Failure", MessageBoxButton.OK, MessageBoxImage.Error);
                        Environment.Exit(1);
#endif
                    }

                    // Run patcher for the offline DB; surface errors during debugging
                    await DbPatcher.EnsureAttendanceSchema(offlineDb, throwOnError: true);
                    await DbPatcher.EnsurePaymentSchema(offlineDb, throwOnError: true);
                    await DbPatcher.EnsureWorkerSchema(offlineDb, throwOnError: true);
                    await DbPatcher.EnsureObligationSchema(offlineDb, throwOnError: true);
                }
            }
            catch (Exception ex)
            {
                // Surface error to the developer during startup so migrations/issues are visible
                MessageBox.Show($"Database initialization failed: {ex.Message}\nSee logs for details.", "Startup Failure", MessageBoxButton.OK, MessageBoxImage.Error);
#if DEBUG
                throw;
#else
                // Ensure we don't continue in a bad state
                DbPatcher.Logger?.LogError(ex, "Fatal startup error");
                Environment.Exit(1);
#endif
            }
        }
    }
}
