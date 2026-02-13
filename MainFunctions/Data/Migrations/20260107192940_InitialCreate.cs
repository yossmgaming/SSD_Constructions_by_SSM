using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Materials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false),
                    Cost = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Client = table.Column<string>(type: "TEXT", nullable: false),
                    Budget = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Workers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FullName = table.Column<string>(type: "TEXT", nullable: false),
                    NIC = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false),
                    DailyRate = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Boqs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    ToAddress = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    DocumentDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Boqs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Boqs_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProjectMaterials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    MaterialId = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantity = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false),
                    UnitCost = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    UsedOn = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMaterials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectMaterials_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMaterials_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    WorkerId = table.Column<int>(type: "INTEGER", nullable: true),
                    MaterialId = table.Column<int>(type: "INTEGER", nullable: true),
                    ClientId = table.Column<int>(type: "INTEGER", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Balance = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    DueDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Payments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Payments_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProjectWorkers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkerId = table.Column<int>(type: "INTEGER", nullable: false),
                    AssignedFrom = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AssignedTo = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Role = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectWorkers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectWorkers_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectWorkers_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BoqItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BoqId = table.Column<int>(type: "INTEGER", nullable: false),
                    ItemNo = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false),
                    Rate = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Amount = table.Column<decimal>(type: "NUMERIC", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoqItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BoqItems_Boqs_BoqId",
                        column: x => x.BoqId,
                        principalTable: "Boqs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BoqItems_BoqId",
                table: "BoqItems",
                column: "BoqId");

            migrationBuilder.CreateIndex(
                name: "IX_Boqs_ProjectId",
                table: "Boqs",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_MaterialId",
                table: "Payments",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ProjectId",
                table: "Payments",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_WorkerId",
                table: "Payments",
                column: "WorkerId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMaterials_MaterialId",
                table: "ProjectMaterials",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMaterials_ProjectId",
                table: "ProjectMaterials",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectWorkers_ProjectId",
                table: "ProjectWorkers",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectWorkers_WorkerId",
                table: "ProjectWorkers",
                column: "WorkerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BoqItems");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "ProjectMaterials");

            migrationBuilder.DropTable(
                name: "ProjectWorkers");

            migrationBuilder.DropTable(
                name: "Boqs");

            migrationBuilder.DropTable(
                name: "Materials");

            migrationBuilder.DropTable(
                name: "Workers");

            migrationBuilder.DropTable(
                name: "Projects");
        }
    }
}
