// Receipt generation utility using jsPDF
import jsPDF from 'jspdf';

export const generateReceipt = (bill) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200], // Receipt-width paper
    });

    const width = 80;
    let y = 10;
    const leftMargin = 5;
    const rightMargin = width - 5;

    // Helper: centered text
    const centerText = (text, yPos, size = 10) => {
        doc.setFontSize(size);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (width - textWidth) / 2, yPos);
    };

    // Helper: left-right text
    const lrText = (left, right, yPos) => {
        doc.text(left, leftMargin, yPos);
        const rWidth = doc.getTextWidth(right);
        doc.text(right, rightMargin - rWidth, yPos);
    };

    // Helper: dashed line
    const dashedLine = (yPos) => {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150);
        doc.line(leftMargin, yPos, rightMargin, yPos);
        doc.setLineDashPattern([], 0);
    };

    // ===== HEADER =====
    doc.setFont('helvetica', 'bold');
    centerText('RESTAURANT PRO', y, 14);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    centerText('Fine Dining & Restaurant', y);
    y += 3.5;
    centerText('123 Food Street, City - 400001', y);
    y += 3.5;
    centerText('Tel: +91 98765 43210', y);
    y += 3.5;
    centerText('GSTIN: 27XXXXX1234X1ZX', y);
    y += 5;

    dashedLine(y);
    y += 4;

    // ===== BILL INFO =====
    doc.setFontSize(8);
    lrText(`Bill #: ${bill.invoiceNumber || bill.id?.slice(0, 8) || 'N/A'}`, `Table: ${bill.tableNumber}`, y);
    y += 4;

    const billDate = bill.date?.toDate ? bill.date.toDate() : new Date(bill.date);
    const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    lrText(`Date: ${dateStr}`, `Time: ${timeStr}`, y);
    y += 5;

    dashedLine(y);
    y += 4;

    // ===== ITEMS HEADER =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Item', leftMargin, y);
    doc.text('Qty', 42, y);
    doc.text('Price', 52, y);
    const amtLabel = 'Amt';
    doc.text(amtLabel, rightMargin - doc.getTextWidth(amtLabel), y);
    y += 2;
    dashedLine(y);
    y += 4;

    // ===== ITEMS =====
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    (bill.items || []).forEach((item) => {
        const name = item.name.length > 18 ? item.name.substring(0, 18) + '.' : item.name;
        doc.text(name, leftMargin, y);
        doc.text(String(item.quantity), 44, y);
        doc.text(`${item.price}`, 52, y);
        const total = `${(item.price * item.quantity).toFixed(0)}`;
        doc.text(total, rightMargin - doc.getTextWidth(total), y);
        y += 4;
    });

    y += 1;
    dashedLine(y);
    y += 4;

    // ===== TOTALS =====
    doc.setFontSize(8);
    lrText('Subtotal:', `Rs. ${bill.subtotal?.toFixed(2)}`, y);
    y += 4;
    lrText(`GST (${bill.gstPercent || 5}%):`, `Rs. ${bill.gst?.toFixed(2)}`, y);
    y += 2;
    dashedLine(y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    lrText('TOTAL:', `Rs. ${bill.total?.toFixed(2)}`, y);
    y += 5;
    dashedLine(y);
    y += 5;

    // ===== FOOTER =====
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    centerText('Thank you for dining with us!', y);
    y += 3.5;
    centerText('Visit again soon', y);
    y += 4;
    centerText('*** Have a great day ***', y);

    // Save
    doc.save(`receipt_table${bill.tableNumber}_${Date.now()}.pdf`);
};

export default generateReceipt;
