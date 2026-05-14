import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface WorkerData {
  certificateData: {
    fileName: string;
    hash: string;
    timestamp: string;
    certificateId: string;
    sequence: string;
    network: string;
    algorithm: string;
    mirrorNodeUrl: string;
  };
  qrDataUrl: string;
  logoUrl: string;
}

addEventListener("message", async (event: MessageEvent<WorkerData>) => {
  const { certificateData, qrDataUrl, logoUrl } = event.data;

  try {
    // 1. Create a brand new PDF Document (Detached Proof Model)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 size
    const { width, height } = page.getSize();

    // 2. Load Fonts and Assets
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Embed QR Code
    const qrResponse = await fetch(qrDataUrl);
    const qrImage = await pdfDoc.embedPng(new Uint8Array(await qrResponse.arrayBuffer()));

    // Embed Logo
    let logoImage;
    try {
      const logoRes = await fetch(logoUrl);
      logoImage = await pdfDoc.embedPng(new Uint8Array(await logoRes.arrayBuffer()));
    } catch (e) {
      console.log("Logo not found, using text header");
    }

    // --- DRAWING THE CERTIFICATE ---

    // A. Draw Decorative Border (Professional Legal Style)
    page.drawRectangle({
      x: 30, y: 30, width: width - 60, height: height - 60,
      borderColor: rgb(0.1, 0.4, 0.6), borderWidth: 2,
    });
    page.drawRectangle({
      x: 35, y: 35, width: width - 70, height: height - 70,
      borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
    });

    // B. Header / Logo
    if (logoImage) {
      const logoDims = logoImage.scale(0.3);
      page.drawImage(logoImage, {
        x: (width / 2) - (logoDims.width / 2),
        y: height - 100,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    // C. Title
    const title = "CERTIFICATE OF DIGITAL AUTHENTICITY";
    const titleWidth = boldFont.widthOfTextAtSize(title, 20);
    page.drawText(title, { 
        x: (width / 2) - (titleWidth / 2), 
        y: height - 160, 
        size: 20, 
        font: boldFont, 
        color: rgb(0.1, 0.1, 0.1) 
    });

    // D. Data Grid
    const startX = 80;
    const startY = height - 220;
    const rowHeight = 30;
    const labelWidth = 150;

    const dataEntries = [
      { label: "File Name:", value: certificateData.fileName },
      { label: "Algorithm:", value: certificateData.algorithm },
      { label: "Network:", value: certificateData.network },
      { label: "Certificate ID:", value: certificateData.certificateId },
      { label: "Sequence:", value: certificateData.sequence },
      { label: "Timestamp (UTC):", value: certificateData.timestamp },
    ];

    dataEntries.forEach((entry, index) => {
      const currentY = startY - (index * rowHeight);
      page.drawText(entry.label, { x: startX, y: currentY, size: 12, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(entry.value, { x: startX + labelWidth, y: currentY, size: 12, font: regularFont, color: rgb(0, 0, 0) });
    });

    // E. The Hash – single continuous line
    const hashY = startY - (dataEntries.length * rowHeight) - 40;
    page.drawText("Cryptographic Hash (SHA-256):", { x: startX, y: hashY + 20, size: 12, font: boldFont });
    
    const hash = certificateData.hash;
    // Use a small font to fit the 64‑character hex string on one line
    page.drawText(hash, {
      x: startX,
      y: hashY,
      size: 7,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: width - startX * 2, // keep within margins
    });
    
    // F. QR Code & Backup Link (centered)
    const qrSize = 100;
    const qrX = (width - qrSize) / 2;    // center horizontally
    const qrY = 120;                     // keep vertical position

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Build the complete direct Mirror Node message URL
    const [topicId, sequenceNumber] = certificateData.certificateId.split('@');
    const verifyUrl = topicId && sequenceNumber
      ? `${certificateData.mirrorNodeUrl}/api/v1/topics/${topicId}/messages/${sequenceNumber}`
      : certificateData.mirrorNodeUrl;

    // Instruction line
    const instrText = "Verify Independently:";
    const instrWidth = boldFont.widthOfTextAtSize(instrText, 10);
    page.drawText(instrText, {
      x: (width - instrWidth) / 2,
      y: qrY - 20,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Full URL in a single, small, centred line
    const urlWidth = regularFont.widthOfTextAtSize(verifyUrl, 6);
    page.drawText(verifyUrl, {
      x: (width - urlWidth) / 2,
      y: qrY - 35,
      size: 6,
      font: regularFont,
      color: rgb(0, 0, 1),
    });

    // G. Footer
    const footer = "This document serves as a detached proof of existence. The original asset remains unaltered.";
    const footerWidth = regularFont.widthOfTextAtSize(footer, 9);
    page.drawText(footer, { x: (width / 2) - (footerWidth / 2), y: 50, size: 9, font: regularFont, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    (self as any).postMessage({ success: true, bytes: pdfBytes, mimeType: "application/pdf" }, [pdfBytes.buffer]);
  } catch (error: any) {
    (self as any).postMessage({ success: false, error: error.message });
  }
});
