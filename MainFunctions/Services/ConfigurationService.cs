using Microsoft.Extensions.Configuration;
using System.IO;

namespace MainFunctions.Services
{
    public static class ConfigurationService
    {
        public static IConfiguration Configuration { get; }

        static ConfigurationService()
        {
            Configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .Build();
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
