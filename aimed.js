/**@license
 *
 *       _      _____ ____    ____ ________ ______
 *      / \    |_   _|_   \  /   _|_   __  |_   _ `.
 *     / _ \     | |   |   \/   |   | |_ \_| | | `. \
 *    / ___ \    | |   | |\  /| |   |  _| _  | |  | |
 *  _/ /   \ \_ _| |_ _| |_\/_| |_ _| |__/ |_| |_.' /
 * |____| |____|_____|_____||_____|________|______.' version 0.1.0
 *
 * AIMED Is Markdown EDitor
 *
 * Copyright (c) 2018-2019 Jakub T. Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 */
/* global define, module, global */
(function(root, factory, undefined) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = function(root) {
            return factory();
        };
    } else {
        root.aimed = factory();
    }
})(typeof window !== 'undefined' ? window : global, function(undefined) {
    function aimed(textarea, options) {
        if (!(this instanceof aimed)) {
            return new aimed(textarea, options);
        }
        var settings = Object.assign({}, aimed.defaults, options);
        this.editor = textarea;
        this.history = [];
        this.pointer = 0;
        this.init(textarea, settings);
    };
    // ------------------------------------------------------------------------------------------
    function is_function(arg) {
        return typeof arg === 'function';
    }
    function create(tag, attrs, children) {
        tag = document.createElement(tag);
        Object.keys(attrs).forEach(function(name) {
            if (name === 'style') {
                Object.keys(attrs.style).forEach(function(name) {
                    tag.style[name] = attrs.style[name];
                });
            } else {
                tag.setAttribute(name, attrs[name]);
            }
        });
        if (children !== undefined) {
            children.forEach(function(child) {
                var node = create.apply(null, child);
                tag.appendChild(node);
            });
        }
        return tag;
    }
    // ------------------------------------------------------------------------------------------
    function escape_regex(str) {
        if (typeof str === 'string') {
            var special = /([-\\^$[\]()+{}?*.|])/g;
            return str.replace(special, '\\$1');
        }
    }
    // ------------------------------------------------------------------------------------------
    aimed.defaults = {
        buttons: [
            {
                className: "fas fa-bold",
                name: 'bold',
                fn: function() {
                    this.toggle('**', 'Bold Text', '**', '[^*_~]');
                }
            },
            {
                className: "fas fa-italic",
                name: 'italic',
                fn: function() {
                    this.toggle('*', 'Italic Text', '*', function(before, after) {
                        // detect if italic is inside bold or single italic
                        var before_num = before.match(/\**$/g)[0].length;
                        var after_num = after.match(/^\**/)[0].length;
                        return (after_num === 1 && before_num === 1) ||
                            (after_num > 2 && before_num > 2);
                    });
                }
            },
            {
                className: "fas fa-underline",
                name: 'underline',
                fn: function() {
                    this.toggle('__', 'Underline Text', '__', '[^*_~]');
                }
            },
            {
                className: "fas fa-strikethrough",
                name: 'strikethrough',
                fn: function() {
                    this.toggle('~~', 'Strikethrough', '~~', '[^*_~]');
                }
            },
            {className: "fas fa-link", name: 'link'},
            {className: "fas fa-image", name: 'image'},
            {className: "fas fa-code", name: 'code'},
            {
                className: "fas fa-quote-right",
                name: 'quote',
                fn: function() {
                    this.toggle('> ', 'Blockquote', '');
                }
            },
            {
                className: "fas fa-list-ul",
                name: 'ul',
                fn: function() {
                    this.swap_lines(/^\s*(?:[-*]|[0-9]\.)\s?/, 'List Item', function(data) {
                        var m = data.lines[0].match(/^\s*([*-]|[0-9]\.)\s*/);
                        var rep = m && m[1].match(/[0-9]+/) || !m ? ' * ' : '';
                        return data.lines.map(function(line) {
                            return line.replace(/^(\s*)(?:[*-]|[0-9]\.)?\s*/, rep);
                        });
                    });
                }
            },
            {
                className: "fas fa-list-ol",
                name: 'ol',
                fn: function() {
                    this.swap_lines(/^\s*(?:[-*]|[0-9]\.)\s?/, 'List Item', function(data) {
                        var lines = data.lines;
                        var last = lines[lines.length - 1];
                        var m = last.match(/^\s*([-*]|[0-9]\.)/);
                        var count = 1;
                        var re = /^\s*((?:[-*]|[0-9]\.)?)\s?/;
                        if (m) {
                            if (m[1].match(/[-*]/)) {
                                return lines.map(function(line) {
                                    return line.replace(re, ' ' + count++ + '. ');
                                });
                            } else {
                                last = last.replace(re, '');
                                console.log({last});
                            }
                        } else {
                            var rep = ' 1. ';
                            for (var i = lines.length; i--;) {
                                m = lines[i].match(re);
                                if (m && m[1]) {
                                    rep = ' ' + (parseInt(m[1], 10) + 1) + '. ';
                                    break;
                                }
                            }
                            last = last.replace(re, rep);
                            console.log({rep, last});
                        }
                        return lines.slice(0, -1).concat([last]);
                    });
                }
            }
        ]
    };
    // ------------------------------------------------------------------------------------------
    aimed.fn = aimed.prototype = {
        init: function(textarea, settings) {
            var wrapper = document.createElement('div');
            var nav = create('nav', {}, [
                ['ul', {}, settings.buttons.map(function(button) {
                    return ['li', {}, [['i', {'class': button.className}]]];
                })]
            ]);
            wrapper.appendChild(nav);
            var self = this;
            nav.addEventListener('click', function(event) {
                self.editor.focus();
                if (event.target.tagName.toLowerCase() === 'i') {
                    var button = settings.buttons.filter(function(button) {
                        return event.target.className === button.className;
                    })[0];
                    if (button && button.fn) {
                        button.fn.call(self);
                    }
                }
            });
            wrapper.className = 'aimed-editor';
            textarea.parentNode.replaceChild(wrapper, textarea);
            wrapper.appendChild(textarea);
        },
        // --------------------------------------------------------------------------------------
        toggle: function(before_str, default_text, after_str, fn) {
            var start_pos = this.editor.selectionStart;
            var end_pos = this.editor.selectionEnd;
            var before = this.editor.value.substring(0, start_pos);
            var after = this.editor.value.substring(end_pos, this.editor.value.length);
            var text;
            if (start_pos !== end_pos) {
                text = this.editor.value.substring(start_pos, end_pos);
            } else {
                text = default_text;
            }
            var before_re = new RegExp(escape_regex(before_str) + '$');
            var after_re = new RegExp('^' + escape_regex(after_str));
            var wrap;
            var valid = true;
            if (is_function(fn)) {
                valid = fn(before, after);
            }
            if (before.match(before_re) && after.match(after_re) && valid) {
                before = before.replace(before_re, '');
                after = after.replace(after_re, '');
                wrap = false;
            } else {
                before += before_str;
                after = after_str + after;
                wrap = true;
            }
            this.editor.value = before + text + after;
            if (start_pos === end_pos) {
                if (wrap) {
                    this.select(
                        start_pos + before_str.length,
                        start_pos + text.length + before_str.length
                    );
                } else {
                    this.select(
                        start_pos - before_str.length,
                        this.editor.selectionStart + text.length
                    );
                }
            } else if (wrap) {
                this.select(
                    start_pos + before_str.length,
                    end_pos + before_str.length
                );
            } else {
                this.select(
                    start_pos - before_str.length,
                    end_pos - before_str.length
                );
            }
        },
        // --------------------------------------------------------------------------------------
        swap_lines: function(re, default_text, fn) {
            var start_pos = this.editor.selectionStart;
            var end_pos = this.editor.selectionEnd;
            var i, len, end_line, start_line;
            var sum = 0;
            var lines = this.editor.value.split(/\n/);
            for (i = 0, len = lines.length; i<len; ++i) {
                sum += lines[i].length + 1;
                if (sum >= start_pos && start_line === undefined) {
                    start_line = i;
                }
                if (sum >= end_pos && end_line === undefined) {
                    end_line = i;
                }
            }
            if (start_pos === 0) {
                start_line = 0;
            } else if (start_line === undefined) {
                start_line = lines.length - 1;
            }
            if (end_line === undefined) {
                end_line = lines.length - 1;
            }
            var before = lines.slice(0, start_line);
            var after = lines.slice(end_line + 1, lines.length);
            var middle = lines.slice(start_line, end_line + 1);
            var range = [0, middle.length - 1];
            var selected = middle.slice();
            for (i = start_line; i--;) {
                if (lines[i].match(re)) {
                    before.pop();
                    middle.unshift(lines[i]);
                    range[0]++;
                } else {
                    break;
                }
            }
            for (i = end_line + 1; i < lines.length; ++i) {
                if (lines[i].match(re)) {
                    after.shift();
                    middle.push(lines[i]);
                    range[1]++;
                } else {
                    break;
                }
            }
            if (middle.length === 0) {
                middle = [default_text];
            }
            lines = before.concat(fn({
                lines: middle,
                selected: range
            }));
            var point;
            if (lines.length === 0) {
                point = 0;
            } else {
                point = lines.reduce(function(acc, line) {
                    return acc + line.length;
                }, 0) + lines.length - 1;
            }
            this.set(lines.concat(after).join('\n'));
            this.select(point, point);
        },
        // --------------------------------------------------------------------------------------
        set: function(text) {
            this.editor.value = text;
        },
        // --------------------------------------------------------------------------------------
        insert: function(text) {
            var start_pos = this.editor.selectionStart;
            var end_pos = this.editor.selectionEnd;
            this.editor.value = this.editor.value.substring(0, start_pos)
                + text
                + this.editor.value.substring(end_pos, this.editor.value.length);
        },
        // --------------------------------------------------------------------------------------
        select: function(start, end) {
            if (start !== undefined && end !== undefined) {
                this.editor.setSelectionRange(start, end);
            }
        },
        // --------------------------------------------------------------------------------------
        selection: function(start, end) {
             if (this.editor.selectionStart !== undefined) {
                var start_pos = this.editor.selectionStart;
                var end_pos = this.editor.selectionEnd;
                return this.editor.value.substring(start_pos, end_pos);
            }
        }
    };
    return aimed;
});
