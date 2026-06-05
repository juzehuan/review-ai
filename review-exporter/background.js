const toDataUrl = (content, mimeType) => {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_FILE") {
    return false;
  }

  try {
    const mimeType = message.mimeType || "text/plain";
    const dataUrl = toDataUrl(message.content || "", mimeType);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: message.filename,
        saveAs: true,
        conflictAction: "uniquify"
      },
      (downloadId) => {
        const errorMessage = chrome.runtime.lastError?.message || null;

        sendResponse({
          ok: !errorMessage && typeof downloadId === "number",
          error: errorMessage
        });
      }
    );
  } catch (error) {
    sendResponse({
      ok: false,
      error: error?.message || String(error)
    });
  }

  return true;
});
