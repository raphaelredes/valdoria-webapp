/* shared/encoding-utils.js — URL-safe Base64 decode + zlib decompress */
function decodeBase64Utf8(b64) {
    var raw = b64.replace(/-/g, '+').replace(/_/g, '/');
    var binary = atob(raw);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

async function decompressPayload(b64) {
    try {
        var std = b64.replace(/-/g, '+').replace(/_/g, '/');
        var binary = atob(std);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var ds = new DecompressionStream('deflate');
        var writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();
        var reader = ds.readable.getReader();
        var chunks = [];
        while (true) {
            var r = await reader.read();
            if (r.done) break;
            chunks.push(r.value);
        }
        var total = chunks.reduce(function(a, c) { return a + c.length; }, 0);
        var result = new Uint8Array(total);
        var offset = 0;
        for (var j = 0; j < chunks.length; j++) {
            result.set(chunks[j], offset);
            offset += chunks[j].length;
        }
        return new TextDecoder().decode(result);
    } catch (e) {
        console.error('[ENCODING] decompressPayload failed:', e);
        throw e;
    }
}
