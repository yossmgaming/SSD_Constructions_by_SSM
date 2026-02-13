using MainFunctions.Data;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace MainFunctions.Services
{
    public class DbContextFactory
    {
        /// <summary>
        /// Creates a new AppDbContext, automatically selecting the online or offline database
        /// based on connectivity.
        /// </summary>
        public async Task<AppDbContext> CreateDbContextAsync()
        {
            var isOnline = await ConnectivityService.IsConnectedAsync();
            
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            if (isOnline)
            {
                var connectionString = ConfigurationService.GetOnlineConnectionString();
                optionsBuilder.UseNpgsql(connectionString);
            }
            else
            {
                var connectionString = ConfigurationService.GetOfflineConnectionString();
                optionsBuilder.UseSqlite(connectionString);
            }

            return new AppDbContext(optionsBuilder.Options);
        }

        /// <summary>
        /// Creates a new AppDbContext specifically for the OFFLINE database.
        /// This is used for startup migrations.
        /// </summary>
        public AppDbContext CreateOfflineDbContext()
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            var connectionString = ConfigurationService.GetOfflineConnectionString();
            optionsBuilder.UseSqlite(connectionString);
            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
