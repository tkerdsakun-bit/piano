import * as XLSX from 'xlsx'

export async function parseFile(file, fileType) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Excel files
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || 
        fileType.includes('xlsx') || fileType.includes('xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let content = ''
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        content += `Sheet: ${sheetName}\n${csv}\n\n`
      })
      
      return content
    }

    // PDF files (simplified - pdf-parse might not work in browser)
    if (fileType.includes('pdf')) {
      return 'PDF parsing requires server-side processing. File uploaded successfully.'
    }

    // Word documents (simplified - mammoth might not work in browser)
    if (fileType.includes('word') || fileType.includes('document') || fileType.includes('docx')) {
      return 'Word document parsing requires server-side processing. File uploaded successfully.'
    }

    // Plain text
    if (fileType.includes('text')) {
      const text = new TextDecoder().decode(buffer)
      return text
    }

    return 'File uploaded successfully. Content type: ' + fileType
  } catch (error) {
    console.error('File parsing error:', error)
    return 'File uploaded but could not extract text content.'
  }
}
