(function (factory) {

    // CommonJS
    if (typeof exports == "object") {
        module.exports = factory(require("underscore"), require("backbone"), require("backgrid"));
    }
    // AMD
    else if (typeof define == "function" && define.amd) {
        define(["underscore", "backbone", "backgrid"], factory);
    }
    // Browser
    else if (typeof _ !== "undefined" && typeof Backbone !== "undefined") {
        return factory(_, Backbone, Backgrid);
    }

}(function (_, Backbone, Backgrid) {
	"use strict";
	
	var BackgridGroup = {};
	var BBPageProto = Backbone.PageableCollection.prototype;
	
	var GroupCollection = BackgridGroup.Collection = Backbone.PageableCollection.extend({
			parse: function (resp, options) {
				var models = BBPageProto.parse.call(this, resp, options);
				this.groupCols = this.parseGroupCol(resp, options);
				return this.parseGroup(models);
			},
			parseGroupCol: function(resp, options){
				return resp.groupColumn;//["column1", "column2"]
			},
			parseGroup: function(models){

				var models1 = _.map(models, _.clone);//create deep copy
				var groupModel = {};
				var index = 0, insertions = 0, level = 0;
				var current, parents, parent;
				var temp;
				_.each(this.groupCols, function(groupCol){
					_.each(models, function(model){
						parents = _.filter(models1, function(mod){
													return !_.has(mod, groupCol) && mod.level === (groupModel.level - 1) && mod.index < groupModel.index;
												});
												
						parent = parents[parents.length-1] || {};
						if(index === level){
							groupModel.groupColumn = groupCol;
							groupModel.groupColumnValue = model[groupCol];
							groupModel.level = level;
							groupModel.index = index;
							groupModel.count = 1;
							current = model[groupCol];
							models1.splice(index + insertions, 0, groupModel); 
							insertions++;
						}else if(_.has(model, groupCol) && ( (model[groupCol] !== current) || (model[groupCol] === current && !_.isUndefined(parent.count) && groupModel.count >= parent.count) ) ){
							groupModel = {};
							groupModel.groupColumn = groupCol;
							groupModel.groupColumnValue = model[groupCol];
							groupModel.level = level;
							groupModel.index = index;
							groupModel.count = 1;
							current = model[groupCol];
							models1.splice(index + insertions, 0, groupModel);
							insertions++;
						}else if(!_.has(model, "groupColumn")){
							groupModel.count++;
						}
						index++;
					});
					temp = models1;
					models1 = _.map(temp, _.clone);
					models = temp;
					index = 0;
					insertions = 0;
					level++;
					groupModel = {};
					current = undefined;
				});
				return models1;
			}
			
	    });
	
	var GroupRow = BackgridGroup.Row = Backgrid.Row.extend({
			events:{
				"click .glyphicon-plus-sign": "toggleRowPhase",
				"click .glyphicon-minus-sign": "toggleRowPhase"
			},
			initialize: function(options){
				this.showGroupedColumns = !_.isUndefined(options) ? options.showGroupedColumns || false : false;
				this.indent = !_.isUndefined(options) ? options.indent || true : true;
				Backgrid.Row.prototype.initialize.call(this, options);
			},
			render: function(){
				var self = this;
				var clazz = '';
				if(_.has(this.model.attributes, "groupColumn")){
				
					if(self.model.get("level") === 0){
						this.model.collection.phaseClass = {};
					}
					this.model.collection.phaseClass[self.model.get("level")] = self.model.cid;
					this.model.collection.level = self.model.get("level");
					
					self.$el.empty();
					self.$el.html("<td colspan=\"" + self.cells.length + "\" class=\"renderable\">" +
									"<span class=\"glyphicon glyphicon-minus-sign\" data-action=\"" + self.model.cid + "\"></span> " + self.columns.findWhere({name: self.model.get("groupColumn")}).get("label") + ": " + self.model.get("groupColumnValue") + " [Count: " + self.model.get("count") + "]" +
								"</td>");
				}else{
					Backgrid.Row.prototype.render.call(this);
				}
				
				if(_.has(this.model.attributes, "groupColumn")){
					this.$el.addClass("group-label");
				}
				
				if(this.indent){
					if(_.has(this.model.attributes, "groupColumn")){
						this.$el.find("td:first").addClass("group-level-" + (this.model.collection.level + 1));
					}else{
						this.$el.find("td:first").addClass("group-level-" + (this.model.collection.level + 2));
					}
				}
				if(!this.showGroupedColumns){
					_.each(this.model.collection.groupCols, function(gc){
						self.columns.findWhere({name: gc}).set("renderable", false);
					});
				}
				_.each(_.keys(this.model.collection.phaseClass), function(level){
					if( !_.has(self.model.attributes, "level") || level < self.model.get("level")){
						clazz = clazz + " " + self.model.collection.phaseClass[level];
					}
				});
				this.$el.addClass(clazz);
				return this;
			},
			toggleRowPhase: function(event){
				var action = $(event.target).data('action');
				if($("."+action).is(":visible")){
					$(event.target).removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
					$("."+action).hide();
				}else{
					$(event.target).removeClass('glyphicon-plus-sign').addClass('glyphicon-minus-sign');
					$("."+action).show();
				}
			}
		});
		
		return BackgridGroup;
}));