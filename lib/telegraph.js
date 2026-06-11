const axios = require("axios");
const FormData = require("form-data");

async function TelegraPh(buffer) {
    const form = new FormData();
    form.append("file", buffer, "image.jpg");

    const { data } = await axios.post(
        "https://telegra.ph/upload",
        form,
        {
            headers: form.getHeaders()
        }
    );

    return "https://telegra.ph" + data[0].src;
}

module.exports = { TelegraPh };
