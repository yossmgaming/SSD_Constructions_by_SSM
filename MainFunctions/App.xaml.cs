using System;
using System.Windows;
using MainFunctions.Data;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Services;

namespace MainFunctions
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override async void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
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
                    catch
                    {
                        await offlineDb.Database.EnsureCreatedAsync();
                    }

                    // Run patcher for the offline DB
                    await DbPatcher.EnsureAttendanceSchema(offlineDb);
                    await DbPatcher.EnsurePaymentSchema(offlineDb);
                    await DbPatcher.EnsureWorkerSchema(offlineDb);
                    await DbPatcher.EnsureObligationSchema(offlineDb);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Database initialization failed: {ex.Message}");
            }
        }
    }
}
