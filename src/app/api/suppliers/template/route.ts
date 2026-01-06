import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * GET /api/suppliers/template
 * Returns an Excel template file for supplier import
 */
export async function GET() {
    // Create workbook with sample data
    const data = [
        {
            "Supplier Name": "Example Company Ltd",
            "Contact Email": "contact@example.com",
            "Tax ID": "TAX-123456"
        },
        {
            "Supplier Name": "",
            "Contact Email": "",
            "Tax ID": ""
        }
    ];

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths for better UX
    worksheet["!cols"] = [
        { wch: 30 }, // Supplier Name
        { wch: 30 }, // Contact Email
        { wch: 20 }, // Tax ID
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return as downloadable file
    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="supplier_import_template.xlsx"',
        },
    });
}
