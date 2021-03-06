"use strict";

var path = require("path"),
    
    each     = require("lodash.foreach"),
    sum      = require("lodash.sumby"),
    parse    = require("module-details-from-path"),
    filesize = require("filesize");
 
module.exports = (options) => {
    var entry, base;

    if(!options) {
        options = false;
    }

    return {
        name : "rollup-plugin-sizes",

        // Grab some needed bits out of the options
        options : (config) => {
            entry = config.entry;
            base  = path.dirname(config.entry);
        },

        // Spit out stats during bundle generation
        ongenerate : (details) => {
            var data   = {},
                totals = [],
                total  = 0;

            details.bundle.modules.forEach((module) => {
                var parsed;
                
                // Handle rollup-injected helpers
                if(module.id.indexOf("\u0000") === 0) {
                    parsed = {
                        name    : "rollup helpers",
                        basedir : "",
                        path    : module.id.replace("\u0000", "")
                    };
                } else {
                    parsed = parse(module.id);
                
                    if(!parsed) {
                        parsed = {
                            name    : "app",
                            basedir : base,
                            path    : path.relative(base, module.id)
                        };
                    }
                }

                if(!(parsed.name in data)) {
                    data[parsed.name] = [];
                }

                data[parsed.name].push(Object.assign(parsed, { size : module.code.length }));
            });

            // Sum all files in each chunk
            each(data, (files, name) => {
                var size = sum(files, "size");

                total += size;
                
                totals.push({
                    name,
                    size
                });
            });

            // Sort
            totals.sort((a, b) => b.size - a.size);

            console.log("%s:", entry);

            totals.forEach((item) => {
                console.log(
                    "%s - %s (%s%%)",
                    item.name,
                    filesize(item.size),
                    ((item.size / total) * 100).toFixed(2)
                );

                if(options.details) {
                    data[item.name]
                        .sort((a, b) => b.size - a.size)
                        .forEach((file) => console.log(
                            "\t%s - %s (%s%%)",
                            file.path,
                            filesize(file.size),
                            ((file.size / item.size) * 100).toFixed(2)
                        ));
                }
            });
        }
    };
};
