using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsedOn",
                table: "ProjectMaterials");

            migrationBuilder.RenameColumn(
                name: "Unit",
                table: "ProjectMaterials",
                newName: "Notes");

            migrationBuilder.CreateTable(
                name: "Attendances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkerId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Present = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attendances_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Attendances_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_ProjectId",
                table: "Attendances",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_WorkerId",
                table: "Attendances",
                column: "WorkerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attendances");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "ProjectMaterials",
                newName: "Unit");

            migrationBuilder.AddColumn<DateTime>(
                name: "UsedOn",
                table: "ProjectMaterials",
                type: "TEXT",
                nullable: true);
        }
    }
}
