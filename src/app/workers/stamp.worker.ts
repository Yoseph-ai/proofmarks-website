import { PDFDocument, rgb } from "pdf-lib";

interface WorkerData {
  fileBytes: Uint8Array;
  qrDataUrl: string; // Changed from verificationUrl to qrDataUrl
  mimeType: string;
}

addEventListener("message", async (event: MessageEvent<WorkerData>) => {
  const { fileBytes, qrDataUrl, mimeType } = event.data;

  try {
    // The QR code is now generated on the main thread, so we just fetch it here
    const qrResponse = await fetch(qrDataUrl);
    const qrImageBytes = await qrResponse.arrayBuffer();

    if (mimeType === "application/pdf") {
      const pdfDoc = await PDFDocument.load(fileBytes);
      const pages = pdfDoc.getPages();
      const qrImage = await pdfDoc.embedPng(new Uint8Array(qrImageBytes));
      const qrSize = 60;
      const margin = 20;

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const x = width - qrSize - margin;
        const y = margin;
        page.drawRectangle({ x: x - 5, y: y - 5, width: qrSize + 10, height: qrSize + 10, color: rgb(1, 1, 1) });
        page.drawImage(qrImage, { x, y, width: qrSize, height: qrSize });
      });

      const stampedBytes = await pdfDoc.save();
      (self as any).postMessage(
        { success: true, bytes: stampedBytes, mimeType: "application/pdf" }, 
        [stampedBytes.buffer]
      );
    } 
    else if (mimeType.startsWith("image/")) {
      const blob = new Blob([fileBytes as any], { type: mimeType });
      const imageBitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(imageBitmap, 0, 0);
      const qrBlob = await (await fetch(qrDataUrl)).blob();
      const qrBitmap = await createImageBitmap(qrBlob);
      const qrSize = Math.round(imageBitmap.width * 0.1);
      const margin = 20;
      const x = canvas.width - qrSize - margin;
      const y = margin;

      ctx.fillStyle = "white";
      ctx.fillRect(x - 5, y - 5, qrSize + 10, qrSize + 10);
      ctx.drawImage(qrBitmap, x, y, qrSize, qrSize);

      const stampedBlob = await canvas.convertToBlob({ type: mimeType });
      const stampedArrayBuffer = await stampedBlob.arrayBuffer();
      const stampedBytes = new Uint8Array(stampedArrayBuffer);
      
      (self as any).postMessage(
        { success: true, bytes: stampedBytes, mimeType }, 
        [stampedBytes.buffer]
      );
    } 
    else {
      (self as any).postMessage({ success: false, error: "Visual stamping not supported for this file type." });
    }
  } catch (error: any) {
    (self as any).postMessage({ success: false, error: error.message });
  }
});