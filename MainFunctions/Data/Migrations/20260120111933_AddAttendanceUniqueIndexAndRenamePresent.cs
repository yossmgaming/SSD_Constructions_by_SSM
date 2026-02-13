using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceUniqueIndexAndRenamePresent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendances_WorkerId",
                table: "Attendances");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_WorkerId_ProjectId_Date",
                table: "Attendances",
                columns: new[] { "WorkerId", "ProjectId", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendances_WorkerId_ProjectId_Date",
                table: "Attendances");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_WorkerId",
                table: "Attendances",
                column: "WorkerId");
        }
    }
}
