using Microsoft.Extensions.Configuration;
using System;

namespace MainFunctions.Services
{
    public static class ConfigurationService
    {
        public static IConfiguration Configuration { get; }

        static ConfigurationService()
        {
            try
            {
                // Use application base directory rather than current working directory.
                // Make the file optional to avoid exceptions if it's not present in the working directory.
                Configuration = new ConfigurationBuilder()
                    .SetBasePath(AppContext.BaseDirectory)
                    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                    .Build();
            }
            catch
            {
                // Fallback to an empty configuration to avoid throwing during static construction.
                Configuration = new ConfigurationBuilder().Build();
            }
        }

        public static string? GetOnlineConnectionString()
        {
            return Configuration.GetConnectionString("OnlineConnection");
        }

        public static string? GetOfflineConnectionString()
        {
            return Configuration.GetConnectionString("OfflineConnection");
        }
    }
}
