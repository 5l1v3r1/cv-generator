/*
 * Copyright (C) 2014 Maxime Falaize
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
$.event.props.push('dataTransfer');
var id = 0, i = 0, $this;

/**
 * Generate a unique Id for each call.
 * @returns {String} The id.
 */
function generateUniqueId() {
    return "ui-id-" + id++;
}

function addField(button) {
    var key = $(button).children().first().text();
    var genericDiv = $(button).parents("div").first().children("#" + key);
    var div = genericDiv.clone();
    div.attr("id", generateUniqueId());
    div.find(".panel-title > a").attr("href", "#collapse" + id);
    div.find(".panel-collapse").attr("id", "collapse" + id);
    div.find("input, select, textarea, .panel-group").each(function() {
        $(this).attr("id", $(this).attr("id") + id);
    });
    div.find("label").each(function() {
        $(this).attr("for", $(this).attr("for") + id);
    });
    div.find("a[data-toggle='collapse']").each(function() {
        $(this).attr("data-parent", $(this).attr("data-parent" + id));
    });
    var appendDiv = genericDiv.prev();
    div.appendTo(appendDiv);
    angular.element(div.find("[ng-bind-template-ext]")).scope().$digest();
    div.show("slow");
    div.on({
        dragstart: function(e) {
            $this = $(this);
            i = $(this).index();
            $(this).find("input").each(function() {
                $(this).attr("value", $(this).val());
            });
            e.dataTransfer.setData("text/html", $(this).html());
        },
        dragover: function(e) {
            e.preventDefault();
        },
        drop: function(e) {
            if (i !== $(this).index()) {
                var data = e.dataTransfer.getData("text/html");
                $(this).find("input").each(function() {
                    $(this).attr("value", $(this).val());
                });
                $this.html($(this).html());
                $(this).html(data);
            }
        }
    });

    return div;
}

function removeField(button) {
    var div = $(button).parents(".panel").first();
    div.hide("slow", function() {
        div.remove();
    });
}

function loadSavedFile(file) {
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var content = e.target.result;
            var cv = JSON.parse(content);

            $.each(cv, function(locale, fields) {
                var parent = locale;
                if ($("#" + parent).length === 0) {
                    loadGenerator(locale);
                }

                var eachFunction = function(field, value) {
                    if (value instanceof Array) {
                        var temp = parent;
                        for (var i = 0; i < value.length; i++) {
                            var div = addField($("#" + parent).find("#" + field + "-add").first());
                            parent = div.attr("id");
                            $.each(value[i], eachFunction);
                            parent = temp;
                        }
                    } else {
                        var jfield = $("#" + parent).find("[name='" + field + "']");
                        if (jfield.attr("type") === "checkbox") {
                            jfield.prop("checked", value);
                        } else if (jfield.attr("type") === "file") {
                            if (value !== "") {
                                addImagePreview(value, jfield);
                            }
                        } else {
                            jfield.val(value);
                        }
                    }
                };

                $.each(fields, eachFunction);
            });
        };
        reader.readAsText(file);
    }
}

function addImagePreview(content, elementToInsertAfter) {
    var next = $(elementToInsertAfter).next();
    if (next.get(0) !== undefined && next.get(0).tagName === "IMG") {
        next.hide("slow", function() {
            next.remove();
        });
    }
    $("<img src=\"" + content + "\" class=\"img-thumbnail\"/>").hide().insertAfter(elementToInsertAfter).show("slow");
}

function loadImage(input) {
    var image = input.files[0];
    if (image) {
        var reader = new FileReader();
        reader.onloadend = function() {
            var content = reader.result;
            addImagePreview(content, input);
        };
        reader.readAsDataURL(image);
    }
}

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        var ascii = binary_string.charCodeAt(i);
        bytes[i] = ascii;
    }
    return bytes.buffer;
}

/**
 * Remove an object from an array.
 *
 * @param {Array} array
 * @param {String} idProperty
 * @param {Object} objectToRemove
 * @returns {Array|removeFromArray.res} A new instance of the array without the removed object.
 */
function removeFromArray(array, idProperty, objectToRemove) {
    var res = new Array();
    angular.forEach(array, function(object, index) {
        if (object[idProperty] !== objectToRemove[idProperty]) {
            res.push(object);
        }
    });
    return res;
}

var cvGeneratorApp = angular.module("cvGeneratorApp", [
    "cvGeneratorControllers",
    "ngAnimate",
    "cvGeneratorDirectives"
]);

cvGeneratorApp.animation(".animation", function() {
    return {
        enter: function(element, done) {
            // We hide immediatly before showing because the element cannot be set
            // with display: none as it is not displayed at the first page load.
            // This workaround is invisible for our eyes.
            $(element).hide();
            $(element).show("slow");
        },
        leave: function(element, done) {
            $(element).hide("slow", function() {
                $(element).remove();
            });
        }
    };
});

var cvGeneratorDirectives = angular.module("cvGeneratorDirectives", []);

cvGeneratorDirectives.directive("ngBindTemplateExt", [function() {
        function link(scope, element, attrs) {
            var value = scope.$eval(attrs.ngBindTemplateExt);
            if (value === undefined) {
                element.text("Temp");
            } else {
                scope.$watch(value, function(value2) {
                    if (value2 === undefined) {
                        element.text("Temp");
                    } else {
                        element.text(value2);
                    }
                });
            }
        }

        return {
            link: link
        };
    }]);


var cvGeneratorControllers = angular.module("cvGeneratorControllers", []);

cvGeneratorControllers.controller("CVGeneratorController", ["$scope", "$http", "$window",
    function($scope, $http, $window) {
        // We hide the form at the beginning
        $scope.showGenerator = false;
        // Selected locale default value to english
        $scope.selectedLocale = "en_US";

        // We show the modal panel to choose our language
        $("#localeModal").modal("show");

        $scope.loadCV = function() {
            $("#savedFile").click();
        };

        $scope.addField = function(field) {
            if (field.fields === undefined) {
                field.fields = new Array();
            }

            var subField = new Object();
            subField.subFields = angular.copy(field.fieldsTemplate);

            // Unique id generation
            subField.id = generateUniqueId();
            angular.forEach(subField.subFields, function(f, index) {
                f.id = generateUniqueId();
            });

            field.fields.push(subField);
        };

        $scope.removeField = function(field, f) {
            field.fields = removeFromArray(field.fields, "id", f);
        };

        $scope.saveCV = function() {
            var saveJson = new Object();
            $(".tab-pane").each(function() {
                var localeContent = new Object();
                var tempContent = localeContent;

                var eachFunction = function() {
                    var name = $(this).attr("name");
                    var children = $(this).children();

                    if (name !== undefined && $(this).attr("added") !== "true") {
                        var tagname = $(this).get(0).tagName;
                        if (tagname === "DIV") {
                            if ($(this).attr("style") !== "display: none;") {
                                if (tempContent[name] === undefined) {
                                    tempContent[name] = new Array();
                                }
                                var temp = tempContent;
                                tempContent = new Object();
                                children.each(eachFunction);
                                temp[name].push(tempContent);
                                tempContent = temp;
                            }
                        } else {
                            var val = $(this).val();
                            if ($(this).attr("type") === "checkbox") {
                                val = $(this).is(":checked");
                            }
                            if ($(this).attr("type") === "file") {
                                val = $(this).next().attr("src");
                            }
                            tempContent[name] = val;
                        }
                    } else {
                        children.each(eachFunction);
                    }
                };

                // We recursively retrieve all values
                $(this).children().each(eachFunction);

                saveJson[$(this).attr("id")] = localeContent;
            });
            var exportData = 'data:text/json;charset=utf-8,';
            exportData += encodeURIComponent(JSON.stringify(saveJson));
            var saveLink = $("#saveCV");
            var nameFile = angular.lowercase($("input[name='lastName']").first().val()) + "_" + angular.lowercase($("input[name='firstName']").first().val()) + ".cvg";
            saveLink.attr("download", nameFile);
            saveLink.attr("href", exportData);
        };

        $scope.generateCV = function() {
            var zip = new JSZip();
            var lastName = angular.lowercase($("input[name='lastName']").first().val());
            var firstName = angular.lowercase($("input[name='firstName']").first().val());
            var root = zip.folder("cv-" + lastName + "-" + firstName + "-v@VERSION@");

            var model = $("select[name='model']").first().val();
            var pdfModel = $("select[name='pdfModel']").first().val();
            var modelPath = "model/" + model + "/";

            var locales = new Array();
            $(".tab-pane").each(function() {
                var locale = $(this).attr("id");
                locales.push(locale);
            });

            // Get identity photo
            var photo = _base64ToArrayBuffer($("input[name='photo']").first().next().attr("src").split(",")[1]);
            root.folder("img").file("identity.jpeg", photo);

            var urls = ["js/cv.js", "index.html", modelPath + model + ".html",
                modelPath + model + "-head.html", modelPath + "index.json", "pdfmodel/" + pdfModel + ".js",
                "locale/locales.json"];

            var i = 0;
            var url = urls[i];

            var getFunction = function(data) {
                var addFile = true;

                if (url === "locale/locales.json") {
                    var newLocales = new Object();
                    newLocales.supportedLocales = new Array();
                    for (var j = 0; j < data.supportedLocales.length; j++) {
                        var supportedLocale = data.supportedLocales[j];
                        if (locales.indexOf(supportedLocale.locale) !== -1) {
                            if ($scope.choosenLocale.locale === supportedLocale.locale) {
                                data.supportedLocales[j].default = true;
                            } else {
                                data.supportedLocales[j].default = false;
                            }
                            newLocales.supportedLocales.push(data.supportedLocales[j]);
                            urls.push("locale/" + supportedLocale.localeFile);

                            // Generate the locale data
                            var dataLocale = new Object();
                            var tempContent = dataLocale;

                            var eachFunction = function() {
                                var name = $(this).attr("name");
                                var children = $(this).children();

                                if (name !== undefined) {
                                    var tagname = $(this).get(0).tagName;
                                    if (tagname === "DIV") {
                                        if ($(this).attr("style") !== "display: none;") {
                                            if (name.indexOf(".") !== -1) {
                                                var splitName = name.split(".");
                                                tempContent[splitName[0] + "Config"] = new Object();
                                                var temp = tempContent;
                                                tempContent = tempContent[splitName[0] + "Config"];
                                                children.each(eachFunction);
                                                tempContent = temp;
                                            } else {
                                                if ($.inArray(name, ["languages", "pastimes"]) !== -1) {
                                                    if (tempContent.miscellaneous === undefined) {
                                                        tempContent.miscellaneous = new Object();
                                                    }
                                                    if (tempContent.miscellaneous[name] === undefined) {
                                                        tempContent.miscellaneous[name] = new Array();
                                                    }
                                                    var temp = tempContent;
                                                    tempContent = new Object();
                                                    children.each(eachFunction);
                                                    temp.miscellaneous[name].push(tempContent);
                                                    tempContent = temp;
                                                } else {

                                                    if (tempContent[name] === undefined) {
                                                        tempContent[name] = new Array();
                                                    }
                                                    var temp = tempContent;
                                                    tempContent = new Object();
                                                    children.each(eachFunction);
                                                    temp[name].push(tempContent);
                                                    tempContent = temp;
                                                }
                                            }
                                        }
                                    } else {
                                        var val = $(this).val();
                                        if ($(this).attr("type") === "checkbox") {
                                            val = $(this).is(":checked");
                                        }

                                        var temp = tempContent;
                                        if (name.search("^currentEmployer\.") !== -1) {
                                            var realName = name.split(".");
                                            name = realName[1];
                                            if (tempContent.currentEmployer === undefined) {
                                                tempContent.currentEmployer = new Object();
                                            }
                                            tempContent = tempContent.currentEmployer;
                                        }

                                        if (angular.isString(val) && val.search("^[0-9]{4}-[0-9]{2}-[0-9]{2}$") !== -1) {
                                            // It is a date
                                            var splitDate = val.split("-");
                                            tempContent[name] = new Object();
                                            tempContent[name].day = splitDate[2];
                                            tempContent[name].month = splitDate[1];
                                            tempContent[name].year = splitDate[0];
                                        } else if ($.inArray(name, ["address", "zipCode", "city", "country"]) !== -1) {
                                            // It is an address
                                            if (tempContent.address === undefined) {
                                                tempContent.address = new Object();
                                            }
                                            tempContent.address[name] = val;
                                        } else if ($.inArray(name, ["drivingLicence", "languages", "pastimes"]) !== -1) {
                                            if (tempContent.miscellaneous === undefined) {
                                                tempContent.miscellaneous = new Object();
                                            }
                                            tempContent.miscellaneous[name] = val;
                                        } else {
                                            tempContent[name] = val;
                                        }
                                        tempContent = temp;
                                    }
                                } else {
                                    children.each(eachFunction);
                                }
                            };

                            $("#" + supportedLocale.locale).children().each(eachFunction);
                            root.folder("data").file(supportedLocale.dataFile, JSON.stringify(dataLocale));
                        }
                    }
                    data = newLocales;
                }

                if (url === modelPath + "index.json") {
                    for (var j = 0; j < data.index.length; j++) {
                        urls.push(modelPath + data.index[j]);
                    }
                    addFile = false;
                }

                var folders = url.split("/");
                var folderString = "";

                for (var j = 0; j < (folders.length - 1); j++) {
                    if (folderString !== "") {
                        folderString += "/";
                    }
                    folderString += folders[j];
                }

                if (data instanceof Object && !(data instanceof ArrayBuffer)) {
                    data = JSON.stringify(data);
                }

                if (addFile) {
                    root.folder(folderString).file(folders[folders.length - 1], data);
                }

                i++;
                if (i < urls.length) {
                    url = urls[i];
                    var options = {};
                    var splitUrl = url.split(".");
                    var extension = splitUrl[splitUrl.length - 1];
                    if (extension !== undefined && $.inArray(extension, ["jpg", "jpeg", "png", "gif", "bmp"]) !== -1) {
                        options = {responseType: "arraybuffer"};
                    }
                    $http.get("cv/" + url, options).success(getFunction);
                } else {
                    var content = zip.generate();
                    location.href = "data:application/zip;base64," + content;
                }
            };

            $http.get("cv/" + url).success(getFunction);
        };

        $scope.getOption = function(field) {
            if (field && field.options && field.value) {
                for (var i = 0; i < field.options.length; i++) {
                    var option = field.options[i];
                    if (option.value === field.value) {
                        return option;
                    }
                }
            }
            return undefined;
        };

        $scope.loadGenerator = function() {
            // We retrieve the locale from the list
            var locale = null;
            for (var i = 0; i < $scope.supportedLocales.length; i++) {
                var l = $scope.supportedLocales[i];
                if (l.locale === $scope.selectedLocale) {
                    locale = $scope.supportedLocales[i];
                    break;
                }
            }

            if (locale !== null) {
                // We activate the locale tab
                $scope.active = locale.locale;

                // We delete the choosen locale from the supported list and
                // reselect the first input
                $scope.supportedLocales = removeFromArray($scope.supportedLocales, "locale", locale);
                if ($scope.supportedLocales.length > 0) {
                    $scope.selectedLocale = $scope.supportedLocales[0].locale;
                }

                if ($scope.cv === undefined) {
                    // This is the first time we choose a language
                    // We load the different strings to display them in the selected locale
                    $http.get("cv/locale/" + locale.localeFile).success(function(data) {
                        $http.get("locale/" + locale.localeFile).success(function(data2) {
                            // We concatenate the two locale files
                            for (var key in data2) {
                                data[key] = data2[key];
                            }
                            $scope.locale = data;

                            // We load the fields to display in the form. We do it here
                            // because we need the locale before to add the fields at the
                            // right place in the model.
                            $http.get("data/data-fields.json").success(function(data) {
                                var cv = $scope.cv = new Array();
                                var choosenLocale = cv[locale.locale] = new Object();

                                // Unique id generation for each fields
                                angular.forEach(data.fields, function(field, index) {
                                    field.id = generateUniqueId();
                                });

                                choosenLocale.fields = data.fields;
                                choosenLocale.locale = locale;
                                cv.push(choosenLocale);

                                // We show the CV generator
                                $scope.showGenerator = true;
                                $("#localeModal").modal("hide");
                            });
                        });
                    });
                } else {
                    // The default language is already set, we have to add a new language here
                    var choosenLocale = $scope.cv[locale.locale] = new Object();
                    choosenLocale.fields = angular.copy($scope.cv[0].fields);
                    choosenLocale.locale = locale;
                    $scope.cv.push(choosenLocale);

                    $("#localeModal").modal("hide");
                }
            }
        };

        $window.loadGenerator = $scope.loadGenerator;

        $scope.addLanguage = function() {
            $("#localeModal").modal("show");
        };

        $http.get("locale/locales.json").success(function(data) {
            $scope.supportedLocales = data.supportedLocales;
        });
    }]);