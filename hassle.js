function HassleSelector(selectorStr) {
    this.str = selectorStr.toLowerCase();
    this.possibles = this.str.split(/\s*,\s*/);
    
    var Requirement = function(selector) {
        this.selector = selector;
    };
    Requirement.prototype.toString = function() {
        return "[Requirement object: match " + this.selector + "]";
    };
    
    for (var i=0, len=this.possibles.length;i<len;i++) {
        var possibleSel = this.possibles[i];
        var reqs = new Requirement(possibleSel);
        
        if (!possibleSel.match(/^(\*|(\w+))?((#\w+)|(\.\w+))*$/)) {
            throw "Unrecognized selector " + possibleSel;
        }
        
        var possible = possibleSel;
        while (possible.length > 0) {
            var currentMatch;
            
            if (currentMatch = possible.match(/^(\*)/)) {
                reqs.all = currentMatch[1];
                possible = possible.substr(currentMatch[1].length);
            }

            if (currentMatch = possible.match(/^(\w+)/)) {
                reqs.tagName = currentMatch[1];
                possible = possible.substr(currentMatch[1].length);
            }
            
            if (currentMatch = possible.match(/^#(\w+)/)) {
                reqs.ids = reqs.ids || [];
                reqs.ids.push(currentMatch[1]);
                possible = possible.substr(currentMatch[1].length+1);
            }
            
            if (currentMatch = possible.match(/^\.(\w+)/)) {
                reqs.classes = reqs.classes || [];
                reqs.classes.push(currentMatch[1]);
                possible = possible.substr(currentMatch[1].length+1);
            }
        }
        
        this.possibles[i] = reqs;
    }
}
HassleSelector.prototype.selectorForNode = function(node) {
    return new HassleSelector(this.str);
};
HassleSelector.prototype.includesElem = function(elem) {
    if (elem.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }
    for (var i in this.possibles) {
        var possible = this.possibles[i];
        var matches = true;
        if (possible.tagName && possible.tagName!==elem.nodeName.toLowerCase()) {
            matches = false;
        }
        if (possible.ids) {
            for (var idIndex in possible.ids) {
                if (possible.ids[idIndex]!==elem.id) {
                    matches = false;
                }
            }
        }
        if (possible.classes) {
            if (elem.className) {
                var classes = elem.className.split(/\s+/);
                matches = false; // temporarily set matches to false
                for (var classNameIndex in classes) {
                    for (var classIndex in possible.classes) {
                        if (possible.classes[classIndex]===classes[classNameIndex]) {
                            matches = true; // set matches back to true if it matches a class
                        }
                    }
                }
            } else {
                matches = false;
            }
        }
        if (matches) {
            return true;
        }
    }
    return false;
};

var hassle = function(selector, element) {
    var sel = [];
    if (!selector) {
        return sel;
    }
    element = element || document;
    
    var hassleSelector = new HassleSelector(selector);
    
    (function(curSelector, curElem, depth) {
        if (curSelector.includesElem(curElem)) {
            sel.push(curElem);
        }
        for (var i=0, child;child=curElem.childNodes[i];i++) {
            if (child.nodeType===Node.ELEMENT_NODE) {
                arguments.callee(curSelector, child, depth+1);
            }
        }
    })(hassleSelector, element, 0);
    
    return sel;
};