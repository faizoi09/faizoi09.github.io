function doGet(e) {
    // Mendapatkan URL dari parameter query
    var fileUrl = e.parameter.url;

    // Logging untuk memeriksa URL yang diterima
    Logger.log('File URL received: ' + fileUrl);

    // Meng-encode URL untuk memastikan tidak ada karakter yang merusak HTML
    var encodedFileUrl = encodeURIComponent(fileUrl);

    // Membuat halaman HTML dengan gambar SVG dan perintah cetak otomatis
    var htmlOutput = HtmlService.createHtmlOutput('<html><head><script>window.onload = function() { window.print(); window.close(); };</script></head><body><img src="' + decodeURIComponent(encodedFileUrl) + '" style="display:block; width:100%; height:auto;" /></body></html>');

    return htmlOutput;
}
