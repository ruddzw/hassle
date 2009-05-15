function HassleRequirements(selector) {
    this.selector = selector.replace(/^\s+/, "").replace(/\s+$/, "");
};
HassleRequirements.prototype.selectorRegExp = /(\*|(\w+))?((#\w+)|(\.\w+))*(\[\w+(!?=\w+)?\])*/;
HassleRequirements.prototype.toString = function() {
    return "[HassleRequirements matching " + this.selector + "]";
};
HassleRequirements.prototype.init = function() {
    
    if (!this.selector.match(new RegExp("^(" + this.selectorRegExp.source +
            "\\s*(>|\\s)\\s*)*" + this.selectorRegExp.source + "$"))) {
        throw "Unrecognized selector " + this.selector;
    }
    
    var selectorToGo = this.selector;
    while(selectorToGo.length > 0) {
        var currentMatch;
        if (currentMatch = selectorToGo.match(/^(\*)/)) {
            this.all = true;
            selectorToGo = selectorToGo.substr(currentMatch[1].length);
        }
        
        if (currentMatch = selectorToGo.match(/^(\w+)/)) {
            this.tagName = currentMatch[1];
            selectorToGo = selectorToGo.substr(currentMatch[1].length);
        }
        
        if (currentMatch = selectorToGo.match(/^#(\w+)/)) {
            this.ids = this.ids || [];
            this.ids.push(currentMatch[1]);
            selectorToGo = selectorToGo.substr(currentMatch[1].length+1);
        }
        
        if (currentMatch = selectorToGo.match(/^\.(\w+)/)) {
            this.classes = this.classes || [];
            this.classes.push(currentMatch[1]);
            selectorToGo = selectorToGo.substr(currentMatch[1].length+1);
        }
        
        if (currentMatch = selectorToGo.match(/^(\s*>\s*)/)) {
            selectorToGo = selectorToGo.substr(currentMatch[1].length);
            this.child = new HassleRequirements(selectorToGo);
            this.child.init();
            this.child.expires = true;
            break;
        }
        
        if (currentMatch = selectorToGo.match(/^(\s+)(\w|\.|#)/)) {
            selectorToGo = selectorToGo.substr(currentMatch[1].length);
            this.descendant = new HassleRequirements(selectorToGo);
            this.descendant.init();
            break;
        }
        
        if (currentMatch = selectorToGo.match(/^\[(\w+)\]/)) {
            this.attrExists = this.attrExists || [];
            this.attrExists.push(currentMatch[1]);
            selectorToGo = selectorToGo.substr(currentMatch[1].length+2);
        }
        
        if (currentMatch = selectorToGo.match(/^\[(\w+)=(\w+)\]/)) {
            this.attrEquals = this.attrEquals || [];
            this.attrEquals.push({name: currentMatch[1], value: currentMatch[2]});
            selectorToGo = selectorToGo.substr(currentMatch[1].length+currentMatch[2].length+3);
        }
        
        if (currentMatch = selectorToGo.match(/^\[(\w+)!=(\w+)\]/)) {
            this.attrNotEquals = this.attrNotEquals || [];
            this.attrNotEquals.push({name: currentMatch[1], value: currentMatch[2]});
            selectorToGo = selectorToGo.substr(currentMatch[1].length+currentMatch[2].length+4);
        }
    }
};
HassleRequirements.prototype.toBeSelected = function() {
    if (this.child || this.descendant) {
        return false;
    } else {
        return true;
    }
}
HassleRequirements.prototype.matchesElem = function(elem) {
    if (elem.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }
    if (this.donotmatch) {
        return false;
    }
    if (this.all) {
        return true;
    }
    if (this.tagName && this.tagName!==elem.nodeName.toLowerCase()) {
        return false;
    }
    if (this.ids) {
        for (var idIndex in this.ids) {
            if (this.ids[idIndex]!==elem.id) {
                return false;
            }
        }
    }
    if (this.classes) {
        if (elem.className) {
            var classes = elem.className.split(/\s+/);
            var matchesAtLeastOneClass = false;
            for (var classNameIndex in classes) {
                for (var classIndex in this.classes) {
                    if (this.classes[classIndex]===classes[classNameIndex]) {
                        matchesAtLeastOneClass = true;
                    }
                }
            }
            if (!matchesAtLeastOneClass) {
                return false;
            }
        } else {
            return false;
        }
    }
    if (this.attrExists) {
        for (var attrExistsIndex in this.attrExists) {
            if (!elem.hasAttribute(this.attrExists[attrExistsIndex])) {
                return false;
            }
        }
    }
    if (this.attrEquals) {
        for (var attrEqualsIndex in this.attrEquals) {
            if (!elem.hasAttribute(this.attrEquals[attrEqualsIndex].name)) {
                return false;
            }
            if (elem.getAttribute(this.attrEquals[attrEqualsIndex].name) !==
                    (this.attrEquals[attrEqualsIndex].value)) {
                return false;
            }
        }
    }
    if (this.attrNotEquals) {
        for (var attrNotEqualsIndex in this.attrNotEquals) {
            if (elem.hasAttribute(this.attrNotEquals[attrNotEqualsIndex].name)) {
                if (elem.getAttribute(this.attrNotEquals[attrNotEqualsIndex].name) ===
                        (this.attrNotEquals[attrNotEqualsIndex].value)) {
                    return false;
                }
            }
        }
    }
    return true;
};
function HassleSelector() {
    this.requirements = [];
};
HassleSelector.prototype.makeRequirementsFromSelector = function(selectorStr) {
    this.requirements = selectorStr.split(/\s*,\s*/);
    for (var i=0, len=this.requirements.length;i<len;i++) {
        this.requirements[i] = new HassleRequirements(this.requirements[i]);
        this.requirements[i].init();
    }
};
HassleSelector.prototype.updatedSelectorForChildrenOf = function(node) {
    var newSelector = new HassleSelector();
    for (var i in this.requirements) {
        var requirement = this.requirements[i];
        if (!requirement.expires) {
            newSelector.requirements.push(requirement);
        }
        if (requirement.child && requirement.matchesElem(node)) {
            newSelector.requirements.push(requirement.child);
        } else if (requirement.descendant && requirement.matchesElem(node)) {
            newSelector.requirements.push(requirement.descendant);
        }
        /*if (requirement.isChild && !requirement.matchesElem(node)) {
            newSelector.requirements[i].donotmatch = true;
        }*/
    }
    return newSelector;
};
HassleSelector.prototype.includesElem = function(elem) {
    for (var i in this.requirements) {
        if(this.requirements[i].toBeSelected() && this.requirements[i].matchesElem(elem)) {
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
    
    var hassleSelector = new HassleSelector();
    hassleSelector.makeRequirementsFromSelector(selector);
    
    (function(curSelector, curElem, depth) {
        if (curSelector.includesElem(curElem)) {
            sel.push(curElem);
        }
        var newSelector = curSelector.updatedSelectorForChildrenOf(curElem);
        for (var i=0, child;child=curElem.childNodes[i];i++) {
            if (child.nodeType===Node.ELEMENT_NODE) {
                arguments.callee(newSelector, child, depth+1);
            }
        }
    })(hassleSelector, element, 0);
    
    return sel;
};