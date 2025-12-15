import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

/**
 * แปลงไฟล์ต่างๆ เป็น text เพื่อส่งให้ AI อ่าน
 * รองรับ: PDF, Word (.docx), Excel (.xlsx, .xls), Text
 */
export async function parseFile(file, fileType) {
  try {
    console.log(`📄 Parsing file: ${file.name}, Type: ${fileType}`)
    
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // ==================== PDF Files ====================
    if (fileType === 'application/pdf') {
      try {
        const data = await pdf(uint8Array)
        
        console.log(`✅ PDF parsed: ${data.numpages} pages, ${data.text.length} characters`)
        
        // ตรวจสอบว่าแปลงได้เนื้อหาไหม
        if (!data.text || data.text.trim().length < 10) {
          console.warn('⚠️ PDF has no extractable text (might be scanned image)')
          return '⚠️ ไฟล์ PDF นี้อาจเป็นรูปภาพที่สแกนมา ไม่สามารถแปลงเป็นข้อความได้\nกรุณาใช้ไฟล์ PDF ที่มี text layer หรือพิมพ์ข้อความได้'
        }
        
        // จำกัดความยาวไม่ให้เกิน 50,000 ตัวอักษร (ป้องกัน token limit)
        const truncatedText = data.text.substring(0, 50000)
        const isTruncated = data.text.length > 50000
        
        return `📄 ไฟล์: ${file.name}\n📊 จำนวนหน้า: ${data.numpages}\n\n${truncatedText}${isTruncated ? '\n\n...(เนื้อหาถูกตัดส่วนเกินเนื่องจากไฟล์ยาวเกินไป)' : ''}`
        
      } catch (error) {
        console.error('❌ PDF parsing error:', error)
        return `❌ ไม่สามารถอ่านไฟล์ PDF นี้ได้\nสาเหตุอาจเป็น: ไฟล์เสียหาย, มีการป้องกันด้วยรหัสผ่าน, หรือใช้รูปแบบ PDF พิเศษ\nError: ${error.message}`
      }
    }

    // ==================== Word Documents (.docx) ====================
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ buffer: uint8Array })
        
        console.log(`✅ Word parsed: ${result.value.length} characters`)
        
        if (!result.value || result.value.trim().length < 10) {
          return '⚠️ ไฟล์ Word นี้ว่างเปล่าหรือไม่มีข้อความที่สามารถอ่านได้'
        }
        
        // จำกัดความยาว
        const truncatedText = result.value.substring(0, 50000)
        const isTruncated = result.value.length > 50000
        
        return `📝 ไฟล์: ${file.name}\n\n${truncatedText}${isTruncated ? '\n\n...(เนื้อหาถูกตัดส่วนเกินเนื่องจากไฟล์ยาวเกินไป)' : ''}`
        
      } catch (error) {
        console.error('❌ Word parsing error:', error)
        return `❌ ไม่สามารถอ่านไฟล์ Word นี้ได้\nError: ${error.message}`
      }
    }

    // ==================== Excel Files (.xlsx, .xls) ====================
    if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        fileType === 'application/vnd.ms-excel') {
      try {
        const workbook = XLSX.read(uint8Array, { type: 'array' })
        let allText = `📊 ไฟล์: ${file.name}\n📑 จำนวน Sheets: ${workbook.SheetNames.length}\n\n`
        
        workbook.SheetNames.forEach((sheetName, index) => {
          const sheet = workbook.Sheets[sheetName]
          const sheetData = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ' }) // ใช้ | แทน comma
          
          allText += `\n${'='.repeat(50)}\n`
          allText += `📋 Sheet ${index + 1}: ${sheetName}\n`
          allText += `${'='.repeat(50)}\n`
          allText += sheetData + '\n'
        })
        
        console.log(`✅ Excel parsed: ${workbook.SheetNames.length} sheets, ${allText.length} characters`)
        
        if (!allText || allText.trim().length < 50) {
          return '⚠️ ไฟล์ Excel นี้ว่างเปล่าหรือไม่มีข้อมูล'
        }
        
        // จำกัดความยาว
        const truncatedText = allText.substring(0, 50000)
        const isTruncated = allText.length > 50000
        
        return truncatedText + (isTruncated ? '\n\n...(เนื้อหาถูกตัดส่วนเกินเนื่องจากไฟล์ยาวเกินไป)' : '')
        
      } catch (error) {
        console.error('❌ Excel parsing error:', error)
        return `❌ ไม่สามารถอ่านไฟล์ Excel นี้ได้\nError: ${error.message}`
      }
    }

    // ==================== Plain Text ====================
    if (fileType === 'text/plain') {
      const text = new TextDecoder('utf-8').decode(uint8Array)
      console.log(`✅ Text parsed: ${text.length} characters`)
      
      if (!text || text.trim().length === 0) {
        return '⚠️ ไฟล์ text ว่างเปล่า'
      }
      
      const truncatedText = text.substring(0, 50000)
      const isTruncated = text.length > 50000
      
      return `📄 ไฟล์: ${file.name}\n\n${truncatedText}${isTruncated ? '\n\n...(เนื้อหาถูกตัดส่วนเกินเนื่องจากไฟล์ยาวเกินไป)' : ''}`
    }

    // ไม่รองรับประเภทไฟล์นี้
    console.warn(`⚠️ Unsupported file type: ${fileType}`)
    return `❌ ประเภทไฟล์นี้ยังไม่รองรับ: ${fileType}\n\nไฟล์ที่รองรับ:\n- PDF (.pdf)\n- Word (.docx)\n- Excel (.xlsx, .xls)\n- Text (.txt)`
    
  } catch (error) {
    console.error('❌ File parsing error:', error)
    return `❌ เกิดข้อผิดพลาดในการแปลงไฟล์\nError: ${error.message}\n\nกรุณาตรวจสอบว่าไฟล์ไม่เสียหายและเป็นประเภทที่รองรับ`
  }
}
