import html2canvas from 'html2canvas';

export async function convertTemplateToImage(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0A0A0A',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }
    }, 'image/png', 1.0);
  });
}
