import { useState } from 'react';
import supabase from '../supabase'; // Adjust the import path as needed
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const ExportData = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            setProgress(10);

            // Count total records first to ensure we're getting everything
            const { count, error: countError } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .not('uid', 'is', null); // Only count records with uid

            if (countError) throw countError;
            
            setProgress(20);

            // Pagination settings
            const pageSize = 1000; // Fetch in chunks to handle large datasets
            let page = 0;
            let allData = [];
            let hasMore = true;

            // Fetch data in chunks
            while (hasMore) {
                const { data, error } = await supabase
                    .from('employees')
                    .select('*')
                    .range(page * pageSize, (page + 1) * pageSize - 1)
                    .order('empid', { ascending: true }); // Using empid instead of id

                if (error) throw error;

                if (data.length > 0) {
                    allData = [...allData, ...data];
                    page++;
                    // Update progress based on how much data we've fetched
                    setProgress(20 + Math.min(60, Math.floor((allData.length / count) * 60)));
                } else {
                    hasMore = false;
                }
            }

            setProgress(80);

            // Verify we got all the data
            console.log(`Exported ${allData.length} of ${count} records`);
            
            if (allData.length < count) {
                console.warn(`Only exported ${allData.length} of ${count} records`);
            }

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(allData);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

            setProgress(90);

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Download file
            saveAs(dataBlob, `employees_data_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            setProgress(100);
            
            // Reset after a short delay
            setTimeout(() => {
                setProgress(0);
                setIsExporting(false);
            }, 1000);

        } catch (error) {
            console.error('Export failed:', error.message);
            alert(`Failed to export data: ${error.message}`);
            setIsExporting(false);
            setProgress(0);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300"
            >
                {isExporting ? 'Exporting...' : 'Export to Excel'}
            </button>
            
            {isExporting && (
                <div className="w-full max-w-md">
                    <div className="bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-center mt-1">{progress === 100 ? 'Export complete!' : `${progress}% complete`}</p>
                </div>
            )}
        </div>
    );
};

export default ExportData;