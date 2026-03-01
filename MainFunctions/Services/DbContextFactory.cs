using MainFunctions.Data;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace MainFunctions.Services
{
    public class DbContextFactory
    {
        /// <summary>
        /// Creates a new AppDbContext, automatically selecting the online or offline database
        /// based on connectivity.
        /// </summary>
        public virtual async Task<AppDbContext> CreateDbContextAsync()
        {
            var isOnline = await ConnectivityService.IsConnectedAsync();

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            if (isOnline)
            {
                var connectionString = ConfigurationService.GetOnlineConnectionString();
                if (!string.IsNullOrWhiteSpace(connectionString))
                {
                    optionsBuilder.UseNpgsql(connectionString);
                }
                else
                {
                    // Online detected but no connection string configured - fallback to offline DB
                    var offlineConn = ConfigurationService.GetOfflineConnectionString();
                    optionsBuilder.UseSqlite(string.IsNullOrWhiteSpace(offlineConn) ? "Data Source=app.db" : offlineConn);
                }
            }
            else
            {
                var connectionString = ConfigurationService.GetOfflineConnectionString();
                optionsBuilder.UseSqlite(string.IsNullOrWhiteSpace(connectionString) ? "Data Source=app.db" : connectionString);
            }

            return new AppDbContext(optionsBuilder.Options);
        }

        /// <summary>
        /// Creates a new AppDbContext specifically for the OFFLINE database.
        /// This is used for startup migrations.
        /// </summary>
        public virtual AppDbContext CreateOfflineDbContext()
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            var connectionString = ConfigurationService.GetOfflineConnectionString();
            optionsBuilder.UseSqlite(string.IsNullOrWhiteSpace(connectionString) ? "Data Source=app.db" : connectionString);
            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
