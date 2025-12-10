-- =============================================
-- SQL Playground Test Database
-- This script creates a sample database for testing
-- =============================================

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestPlayground')
BEGIN
    CREATE DATABASE TestPlayground;
    PRINT 'Database TestPlayground created successfully';
END
ELSE
BEGIN
    PRINT 'Database TestPlayground already exists';
END
GO

USE TestPlayground;
GO

-- =============================================
-- Create Tables
-- =============================================

-- Employees Table
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employees (
        EmployeeID INT PRIMARY KEY IDENTITY(1,1),
        FirstName NVARCHAR(50) NOT NULL,
        LastName NVARCHAR(50) NOT NULL,
        Email NVARCHAR(100) UNIQUE NOT NULL,
        DepartmentID INT,
        HireDate DATE NOT NULL,
        Salary DECIMAL(10,2) NOT NULL,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Employees created';
END

-- Departments Table
IF OBJECT_ID('dbo.Departments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departments (
        DepartmentID INT PRIMARY KEY IDENTITY(1,1),
        DepartmentName NVARCHAR(50) NOT NULL,
        Location NVARCHAR(100),
        ManagerID INT,
        Budget DECIMAL(12,2),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Departments created';
END

-- Projects Table
IF OBJECT_ID('dbo.Projects', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Projects (
        ProjectID INT PRIMARY KEY IDENTITY(1,1),
        ProjectName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500),
        StartDate DATE NOT NULL,
        EndDate DATE,
        Budget DECIMAL(12,2),
        Status NVARCHAR(20) DEFAULT 'Active',
        DepartmentID INT,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Projects created';
END

-- Employee Projects (Many-to-Many relationship)
IF OBJECT_ID('dbo.EmployeeProjects', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmployeeProjects (
        EmployeeID INT NOT NULL,
        ProjectID INT NOT NULL,
        Role NVARCHAR(50),
        HoursWorked DECIMAL(6,2) DEFAULT 0,
        AssignedDate DATE DEFAULT GETDATE(),
        PRIMARY KEY (EmployeeID, ProjectID),
        FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees(EmployeeID),
        FOREIGN KEY (ProjectID) REFERENCES dbo.Projects(ProjectID)
    );
    PRINT 'Table EmployeeProjects created';
END

GO

-- =============================================
-- Insert Sample Data
-- =============================================

-- Insert Departments
IF NOT EXISTS (SELECT 1 FROM dbo.Departments)
BEGIN
    INSERT INTO dbo.Departments (DepartmentName, Location, Budget) VALUES
    ('Engineering', 'Building A', 500000.00),
    ('Marketing', 'Building B', 250000.00),
    ('Sales', 'Building B', 300000.00),
    ('Human Resources', 'Building C', 150000.00),
    ('Finance', 'Building C', 200000.00);
    PRINT 'Sample departments inserted';
END

-- Insert Employees
IF NOT EXISTS (SELECT 1 FROM dbo.Employees)
BEGIN
    INSERT INTO dbo.Employees (FirstName, LastName, Email, DepartmentID, HireDate, Salary) VALUES
    ('John', 'Smith', 'john.smith@company.com', 1, '2020-01-15', 85000.00),
    ('Sarah', 'Johnson', 'sarah.johnson@company.com', 1, '2019-03-22', 92000.00),
    ('Michael', 'Williams', 'michael.williams@company.com', 2, '2021-06-10', 68000.00),
    ('Emily', 'Brown', 'emily.brown@company.com', 3, '2020-11-05', 72000.00),
    ('David', 'Jones', 'david.jones@company.com', 1, '2018-09-18', 95000.00),
    ('Lisa', 'Davis', 'lisa.davis@company.com', 4, '2021-02-28', 65000.00),
    ('James', 'Miller', 'james.miller@company.com', 5, '2019-07-14', 78000.00),
    ('Jennifer', 'Wilson', 'jennifer.wilson@company.com', 2, '2022-01-09', 64000.00),
    ('Robert', 'Moore', 'robert.moore@company.com', 3, '2020-04-20', 75000.00),
    ('Amanda', 'Taylor', 'amanda.taylor@company.com', 1, '2021-08-12', 88000.00);
    PRINT 'Sample employees inserted';
END

-- Insert Projects
IF NOT EXISTS (SELECT 1 FROM dbo.Projects)
BEGIN
    INSERT INTO dbo.Projects (ProjectName, Description, StartDate, EndDate, Budget, Status, DepartmentID) VALUES
    ('Website Redesign', 'Complete overhaul of company website', '2024-01-01', '2024-06-30', 150000.00, 'Active', 1),
    ('Mobile App Development', 'iOS and Android app for customers', '2024-02-15', '2024-12-31', 200000.00, 'Active', 1),
    ('Marketing Campaign Q1', 'Digital marketing campaign for Q1', '2024-01-01', '2024-03-31', 80000.00, 'Completed', 2),
    ('Sales Training Program', 'Comprehensive sales team training', '2024-03-01', '2024-05-31', 50000.00, 'Active', 3),
    ('HR Portal Upgrade', 'Employee self-service portal improvements', '2024-04-01', '2024-09-30', 75000.00, 'Planning', 4);
    PRINT 'Sample projects inserted';
END

-- Assign Employees to Projects
IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeProjects)
BEGIN
    INSERT INTO dbo.EmployeeProjects (EmployeeID, ProjectID, Role, HoursWorked) VALUES
    (1, 1, 'Lead Developer', 120.5),
    (2, 1, 'Frontend Developer', 115.0),
    (5, 1, 'Backend Developer', 130.0),
    (10, 1, 'UI/UX Designer', 95.5),
    (1, 2, 'Technical Lead', 85.0),
    (5, 2, 'Senior Developer', 90.0),
    (3, 3, 'Campaign Manager', 140.0),
    (8, 3, 'Content Creator', 110.5),
    (4, 4, 'Training Coordinator', 95.0),
    (9, 4, 'Sales Lead', 80.0);
    PRINT 'Employee-project assignments created';
END

GO

-- =============================================
-- Create Views
-- =============================================

-- View: Employee Details with Department
IF OBJECT_ID('dbo.vw_EmployeeDetails', 'V') IS NOT NULL
    DROP VIEW dbo.vw_EmployeeDetails;
GO

CREATE VIEW dbo.vw_EmployeeDetails AS
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    e.Email,
    d.DepartmentName,
    d.Location,
    e.HireDate,
    e.Salary,
    e.IsActive,
    DATEDIFF(YEAR, e.HireDate, GETDATE()) AS YearsOfService
FROM dbo.Employees e
LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID;
GO

PRINT 'View vw_EmployeeDetails created';

-- View: Project Summary
IF OBJECT_ID('dbo.vw_ProjectSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ProjectSummary;
GO

CREATE VIEW dbo.vw_ProjectSummary AS
SELECT 
    p.ProjectID,
    p.ProjectName,
    p.Status,
    d.DepartmentName,
    COUNT(ep.EmployeeID) AS TeamSize,
    SUM(ep.HoursWorked) AS TotalHours,
    p.Budget,
    p.StartDate,
    p.EndDate
FROM dbo.Projects p
LEFT JOIN dbo.Departments d ON p.DepartmentID = d.DepartmentID
LEFT JOIN dbo.EmployeeProjects ep ON p.ProjectID = ep.ProjectID
GROUP BY p.ProjectID, p.ProjectName, p.Status, d.DepartmentName, p.Budget, p.StartDate, p.EndDate;
GO

PRINT 'View vw_ProjectSummary created';

-- =============================================
-- Create Stored Procedures
-- =============================================

-- Stored Procedure: Get Department Statistics
IF OBJECT_ID('dbo.sp_GetDepartmentStats', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDepartmentStats;
GO

CREATE PROCEDURE dbo.sp_GetDepartmentStats
    @DepartmentID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        d.DepartmentID,
        d.DepartmentName,
        d.Location,
        COUNT(e.EmployeeID) AS EmployeeCount,
        AVG(e.Salary) AS AverageSalary,
        MIN(e.Salary) AS MinSalary,
        MAX(e.Salary) AS MaxSalary,
        d.Budget
    FROM dbo.Departments d
    LEFT JOIN dbo.Employees e ON d.DepartmentID = e.DepartmentID AND e.IsActive = 1
    WHERE (@DepartmentID IS NULL OR d.DepartmentID = @DepartmentID)
    GROUP BY d.DepartmentID, d.DepartmentName, d.Location, d.Budget
    ORDER BY d.DepartmentName;
END
GO

PRINT 'Stored procedure sp_GetDepartmentStats created';

-- =============================================
-- Create Indexes for Performance
-- =============================================

-- Indexes on Employees
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_DepartmentID' AND object_id = OBJECT_ID('dbo.Employees'))
    CREATE INDEX IX_Employees_DepartmentID ON dbo.Employees(DepartmentID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_Email' AND object_id = OBJECT_ID('dbo.Employees'))
    CREATE INDEX IX_Employees_Email ON dbo.Employees(Email);

-- Indexes on Projects
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Projects_DepartmentID' AND object_id = OBJECT_ID('dbo.Projects'))
    CREATE INDEX IX_Projects_DepartmentID ON dbo.Projects(DepartmentID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Projects_Status' AND object_id = OBJECT_ID('dbo.Projects'))
    CREATE INDEX IX_Projects_Status ON dbo.Projects(Status);

PRINT 'Indexes created';

GO

-- =============================================
-- Summary
-- =============================================

PRINT '';
PRINT '=============================================';
PRINT 'Test Database Setup Complete!';
PRINT '=============================================';
PRINT '';
PRINT 'Database: TestPlayground';
PRINT 'Tables Created:';
PRINT '  - Employees (10 records)';
PRINT '  - Departments (5 records)';
PRINT '  - Projects (5 records)';
PRINT '  - EmployeeProjects (10 relationships)';
PRINT '';
PRINT 'Views Created:';
PRINT '  - vw_EmployeeDetails';
PRINT '  - vw_ProjectSummary';
PRINT '';
PRINT 'Stored Procedures:';
PRINT '  - sp_GetDepartmentStats';
PRINT '';
PRINT 'Try these queries in SQL Playground:';
PRINT '  SELECT * FROM Employees';
PRINT '  SELECT * FROM vw_EmployeeDetails';
PRINT '  SELECT * FROM vw_ProjectSummary';
PRINT '  EXEC sp_GetDepartmentStats';
PRINT '';
PRINT '=============================================';

-- Set as default database (optional)
-- USE master;
-- ALTER DATABASE TestPlayground SET RECOVERY SIMPLE;