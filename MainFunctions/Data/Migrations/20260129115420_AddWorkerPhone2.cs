using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkerPhone2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendances_ProjectId",
                table: "Attendances");

            migrationBuilder.AddColumn<string>(
                name: "Phone2",
                table: "Workers",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "HoursWorked",
                table: "Attendances",
                type: "NUMERIC",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsHalfDay",
                table: "Attendances",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "PaymentHeaders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    EntityId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DueDate = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentHeaders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PaymentHeaderId = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "NUMERIC", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentLines_PaymentHeaders_PaymentHeaderId",
                        column: x => x.PaymentHeaderId,
                        principalTable: "PaymentHeaders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Settlements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PaymentHeaderId = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Method = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Settlements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Settlements_PaymentHeaders_PaymentHeaderId",
                        column: x => x.PaymentHeaderId,
                        principalTable: "PaymentHeaders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_ProjectId_Date",
                table: "Attendances",
                columns: new[] { "ProjectId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_WorkerId_Date",
                table: "Attendances",
                columns: new[] { "WorkerId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentHeaders_Type_EntityId_ProjectId_PeriodStart_PeriodEnd",
                table: "PaymentHeaders",
                columns: new[] { "Type", "EntityId", "ProjectId", "PeriodStart", "PeriodEnd" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentLines_PaymentHeaderId",
                table: "PaymentLines",
                column: "PaymentHeaderId");

            migrationBuilder.CreateIndex(
                name: "IX_Settlements_PaymentHeaderId",
                table: "Settlements",
                column: "PaymentHeaderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentLines");

            migrationBuilder.DropTable(
                name: "Settlements");

            migrationBuilder.DropTable(
                name: "PaymentHeaders");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_ProjectId_Date",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_WorkerId_Date",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "Phone2",
                table: "Workers");

            migrationBuilder.DropColumn(
                name: "HoursWorked",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "IsHalfDay",
                table: "Attendances");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_ProjectId",
                table: "Attendances",
                column: "ProjectId");
        }
    }
}
