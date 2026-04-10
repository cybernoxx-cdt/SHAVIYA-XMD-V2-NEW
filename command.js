// command.js
var commands = [];

function cmd(info, func) {
    var data = Object.assign({}, info);
    data.function = func;

    // ✅ FIX: pattern can be RegExp or string — don't call .toLowerCase() on RegExp
    if (typeof info.pattern === 'string') {
        data.pattern = info.pattern.toLowerCase();
    } else if (info.pattern instanceof RegExp) {
        data.pattern = info.pattern; // keep RegExp as-is
    } else {
        data.pattern = info.pattern || '';
    }

    data.alias = info.alias || [];
    data.react = info.react || '';
    data.on = info.on || 'command';
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!info.category) data.category = 'misc';
    if (!info.filename) data.filename = "Not Provided";
    commands.push(data);
    return data;
}

module.exports = { cmd, AddCommand: cmd, Function: cmd, Module: cmd, commands };
