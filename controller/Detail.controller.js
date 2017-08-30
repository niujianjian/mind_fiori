/*global location */
sap.ui.define([
	"com/mindray/oppprt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/mindray/oppprt/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/Component"
], function(BaseController, JSONModel, formatter, MessageBox, MessageToast, Component) {
	"use strict";
	return BaseController.extend("com.mindray.oppprt.controller.Detail", {
		formatter: formatter,
		/* =========================================================== */
		/* 状态丢单，显示输赢分析from，编辑按钮不显示                    */
		/* =========================================================== */
		checkDisplay: function(v) {
			if (v === "E0004") {
				this.byId("iconTabBarFilter1").setVisible(true); //输赢分析from
			} else {
				this.byId("iconTabBarFilter1").setVisible(false);
			}
			return v;
		},
		/* =========================================================== */
		/* 销售组是200/210/220/300/310/320：					       */
		/* 行项目的销售类型显示，其余隐藏。                             */
		/* =========================================================== */
		checkSdtype: function(v) {
			var oViewModel = this.getModel("detailView");
			if ([
					"200",
					"210",
					"220",
					"300",
					"310",
					"320"
				].indexOf(v) === 0) {
				oViewModel.setProperty("/sdtypeHide", true);
			} else {
				oViewModel.setProperty("/sdtypeHide", false);
			}
			return v;
		},
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		onInit: function() {
			this._initStyle();
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				sdtypeHide: false,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});
			this.byId("FormDisplay1").bindElement("ZOPP_HEADER");
			this.byId("FormDisplay2").bindElement("ZOPP_ANALYSIS");
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function(oEvent) {
			var sTitle, iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");
			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
					this.byId("iconTabBarFilter3").setCount([iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
					this.byId("iconTabBarFilter3").setCount(0);
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},
		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onPartnerUpdateFinished: function(oEvent) {
			var iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final
			if (this.byId("linePartnerList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					this.byId("iconTabBarFilter4").setCount([iTotalItems]);
				} else {
					this.byId("iconTabBarFilter4").setCount(0);
				}
			}
		},
		/**
		 * Show the detail of product when press the line item
		 * @param {object} oEvent an event turn to  the detail
		 * @private
		 */
		onProductDetail: function(oEvent) {
			var oItem = oEvent.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("productDetail", {
				Guid: encodeURIComponent(oItem.getBindingContext().getProperty("Guid"))
			});
		},
		/**
		 * Event handler (attached declaratively) for the view delete button. Deletes the selected item. 
		 * @function
		 * @public
		 */
		onDelete: function() {
			var that = this;
			var oViewModel = this.getModel("detailView"),
				sPath = oViewModel.getProperty("/sObjectPath"),
				sObjectHeader = this._oODataModel.getProperty(sPath + "/Description"),
				sQuestion = this._oResourceBundle.getText("deleteText", sObjectHeader),
				sSuccessMessage = this._oResourceBundle.getText("deleteSuccess", sObjectHeader);
			var fnMyAfterDeleted = function() {
				MessageToast.show(sSuccessMessage);
				oViewModel.setProperty("/busy", false);
				var oNextItemToSelect = that.getOwnerComponent().oListSelector.findNextItem(sPath);
				that.getModel("appView").setProperty("/itemToSelect", oNextItemToSelect.getBindingContext().getPath()); //save last deleted
			};
			this._confirmDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);
		},
		/**
		 * Event handler (attached declaratively) for the view edit button. Open a view to enable the user update the selected item. 
		 * @function
		 * @public
		 */
		onEdit: function(oEvn) {
			this.getModel("appView").setProperty("/addEnabled", false);
			var sObjectPath = this.getView().getElementBinding().getPath();
			// this.getRouter().getTargets().display("create", {
			// 	mode: "update",
			// 	objectPath: sObjectPath
			// });
			this.getRouter().getTargets().display("edit", {
				mode: "update",
				objectPath: sObjectPath
			});
		},
		/**
		 * Event handler (attached declaratively) for the view edit button. Open a view to enable the user update the selected item. 
		 * @function
		 * @public
		 */
		onCopy: function() {
			this.getModel("appView").setProperty("/addEnabled", false);
			var sObjectPath = this.getView().getElementBinding().getPath();
			this.getRouter().getTargets().display("create", {
				mode: "copy",
				objectPath: sObjectPath
			});
		},
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var oParameter = oEvent.getParameter("arguments");
			for (var value in oParameter) {
				oParameter[value] = decodeURIComponent(oParameter[value]);
			}
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("ZOPP_GET_LISTSet", oParameter);
				this._getFav("/" + sObjectPath);
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},
		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},
		/**
		 * Event handler for binding change event
		 * @function
		 * @private
		 */
		_onBindingChange: function() {
			//  default:show the first tab as open
			this.byId("iconTabBar").setSelectedKey("");
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				oViewModel = this.getModel("detailView"),
				oAppViewModel = this.getModel("appView");
			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}
			var sPath = oElementBinding.getBoundContext().getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Guid;
			oViewModel.setProperty("/sObjectId", sObjectId);
			oViewModel.setProperty("/sObjectPath", sPath);
			oAppViewModel.setProperty("/itemToSelect", sPath);
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
		},
		/**
		 * Event handler for metadata loaded event
		 * @function
		 * @private
		 */
		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = !!oLineItemTable && oLineItemTable.getBusyIndicatorDelay();
			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);
			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});
			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */
		// using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function(oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function() {
				// Calls the oData Delete service
				this._callDelete(aPaths, fnAfterDeleted);
			}.bind(this);
			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [
					MessageBox.Action.OK,
					MessageBox.Action.CANCEL
				],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},
		/**
		 * Performs the deletion of a list of entities.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		_callDelete: function(aPaths, fnAfterDeleted) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function() {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function() {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
		},
		/**
		 * Deletes the entity from the odata model
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnSuccess - Event handler for success operation.
		 * @param {callback} fnFailed - Event handler for failure operation.
		 * @function
		 * @private
		 */
		_deleteOneEntity: function(sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function(fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},
		/**
		 * 拨打电话
		 * @function
		 * @private
		 */
		onPhoneLinkPress: function(evt) {
			sap.m.URLHelper.triggerTel(this._getVal(evt));
		},
		_getVal: function(evt) {
			return sap.ui.getCore().byId(evt.getParameter("id")).getText();
		},
		/**
		 * 初始化CSS
		 * @function
		 * @private
		 */
		_initStyle: function() {
			// 	var sly = document.getElementById("myStyle");
			// 	if (!sly) {
			// 		var css =
			// 			".sapMSlt{border:0px;}.sapMSlt{position:inherit;}.sapUiSizeCompact .sapMSltLabel, .sapUiSizeCompact .sapMSlt .sapMSelectListItemBase, .sapUiSizeCondensed .sapUiTableCell .sapMSltLabel, .sapUiSizeCondensed .sapUiTableCell .sapMSlt .sapMSelectListItemBase{padding-left:0;}";
			// 	sly = document.createElement("style");
			// 	sly.innerHTML = css;
			// 	sly.id = "myStyle";
			// 	document.body.appendChild(sly);
			// }
		},
		/**
		 *@memberOf com.mindray.oppprt.controller.Detail
		 */
		onFav: function(oEvent) {
			//This code was generated by the layout editor.
			var _guid = this.getModel("detailView").getProperty("/sObjectId");
			var oData_str = {};
			oData_str.Guid = _guid;
			var that = this;
			that.op_guid = _guid;

			function fnSuccess(oData, oResponse) { 
				var oParameter = new Array("Guid");
				oParameter["Guid"] = that.op_guid;
				var sObjectPath = that.getModel().createKey("/ZOPP_GET_LISTSet", oParameter);
				that._getFav(sObjectPath, true);
			}

			function fnError(oError) {
				MessageToast.show("\u6536\u85CF\u63D0\u4EA4\u5931\u8D25!");
				console.log("Error", oError);
			}
			this.getModel().create("/ZOPP_COLLECTSet", oData_str, {
				success: fnSuccess,
				error: fnError
			});
		},
		/* =========================================================== */
		/* detail页获取 收藏标记                    */
		/* =========================================================== */
		_getFav: function(sPath, favFlag) {
				var that = this;
				that.favFlag = favFlag;

				function fnSuccess(oData, oResponse) {
					var but_fav = that.byId("__button_fav");
					if (oData.CollectFlag !== "") {
						if (that.favFlag) {
							MessageToast.show("\u5DF2\u6536\u85CF");
						};
						that.getModel("detailView").setProperty("/FavIcon", "sap-icon://favorite");
					} else {
						if (that.favFlag) {
							MessageToast.show("\u5DF2\u53D6\u6D88\u6536\u85CF");
						};
						that.getModel("detailView").setProperty("/FavIcon", "sap-icon://unfavorite");
					}
				}

				function fnError(oError) {
					MessageToast.show("\u8BFB\u53D6\u6536\u85CF\u6807\u8BB0\u5931\u8D25!");
					console.log("Error", oError);
				}
				this.getModel().read(sPath, {
					success: fnSuccess,
					error: fnError
				});
			},
			/**
			 *@memberOf com.mindray.oppprt.controller.Detail
			 */
		onContinue: function() {
			var that = this;
			that.oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
			var _guid = this.getModel("detailView").getProperty("/sObjectId");
			var oParameter = new Array("Guid");
			oParameter["Guid"] = _guid;
			var sObjectPath = this.getModel().createKey("/ZOPP_HEADERSet", oParameter);
			//This code was generated by the layout editor.
			// trigger navigation
			function fnSuccess(oData, oResponse) {
				that.oCrossAppNav.toExternal({
					target: {
						semanticObject: "ZCRM_GY_HD_0001",
						action: "display"
					},
					params: {
						Partner: oData.Partner,
						PartnerT: oData.PartnerT
					}
				});
			}

			function fnError(oError) {
				MessageToast.show("客户数据获取失败");
				console.log("Error", oError);
			}

			this.getModel().read(sObjectPath, {
				success: fnSuccess,
				error: fnError
			});

		}
	});
});