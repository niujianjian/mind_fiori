sap.ui.define([
	"com/mindray/oppprt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text"
], function(BaseController, JSONModel, Filter, MessageBox, MessageToast, MessagePopover, MessagePopoverItem, Dialog, Button, Text) {
	"use strict";

	var oMessageTemplate = new MessagePopoverItem({
		type: "{type}",
		title: "{title}"
	});

	var oMessagePopover = new MessagePopover({
		items: {
			path: "/",
			template: oMessageTemplate
		}
	});

	return BaseController.extend("com.mindray.oppprt.controller.EditEntity", {

		_oBinding: {},
		/* =========================================================== */
		/* check the partnerfct is edited/delete                       */
		/* =========================================================== */
		check: function(v) {
			if (this._oViewModel.getProperty("/enableEdit")) {
				return ["ZMR00001", "ZMR00002", "ZMR00003", "ZMR00010"].indexOf(v) === -1;
			} else {
				return false;
			}
		},
		checkDelete: function(v) {
			if (this._oViewModel.getProperty("/enableEdit")) {
				return ["ZMR00005", "ZMR00007"].indexOf(v) === 0;
			} else {
				return false;
			}

		},
		/* =========================================================== */
		/* 如果为赢单，只有装机日期可以编辑 					       */
		/* 只有为丢单，才显示输赢分析from                              */
		/* =========================================================== */
		checkEdit: function(v) {
			if (v === "E0003") {
				this._oViewModel.setProperty("/enableEdit", false);
			} else {
				this._oViewModel.setProperty("/enableEdit", true);
			}
			if (v === "E0004") {
				this.byId("Panel2").setVisible(true);
			} else {
				this.byId("Panel2").setVisible(false);
			}
			return v;
		},
		/* =========================================================== */
		/* 销售组是200/210/220/300/310/320：					       */
		/* 行项目的销售类型显示，其余隐藏。                             */
		/* =========================================================== */
		checkSdtype: function(v) {

			if (["200", "210", "220", "300", "310", "320"].indexOf(v) === 0) {
				this._oViewModel.setProperty("/sdtypeHide", true);
			} else {
				this._oViewModel.setProperty("/sdtypeHide", false);
			}
			return v;
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {

			var that = this;
			this.getRouter().getTargets().getTarget("edit").attachDisplay(null, this._onDisplay, this);
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();
			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				messageCount: "",
				enableEdit: true,
				sdtypeHide: false
			});
			this.setModel(this._oViewModel, "viewModel");
			this.byId("newEntityForm1").bindElement("ZOPP_HEADER");
			this.byId("newEntityForm2").bindElement("ZOPP_ANALYSIS");

			// Register the view with the message manager
			sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
			var oMessagesModel = sap.ui.getCore().getMessageManager().getMessageModel();
			this._oBinding = new sap.ui.model.Binding(oMessagesModel, "/", oMessagesModel.getContext("/"));
			this._oBinding.attachChange(function(oEvent) {
				var aMessages = oEvent.getSource().getModel().getData();
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						that._oViewModel.setProperty("/enableCreate", false);
					}
				}
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler (attached declaratively) for the view save button. Saves the changes added by the user. 
		 * @function
		 * @public
		 */
		onSave: function() {
			//check before save
			if (this._checkBeforeSave()) {
				return;
			}
			this.getModel("appView").setProperty("/busy", true); //设置页面显示忙碌
			var that = this;
			var requestORderHeader = this._getOdata();
			var oModel = this._createoModel();
			// Call the create request
			oModel.create("/ZOPP_GET_LISTSet", requestORderHeader, {
				success: function(oData, oResponse) {
					that._oODataModel.refresh();
					MessageToast.show(that._oResourceBundle.getText("updateSucess"));
					that._fnUpdateSuccess();
				},
				error: function(oError) {
					that._fnEntityCreationFailed(oError);
				}
			});
		},

		/**
		 * Event handler (attached declaratively) for the view cancel button. Asks the user confirmation to discard the changes. 
		 * @function
		 * @public
		 */
		onCancel: function() {
			// check if the model has been changed
			if (this.getModel().hasPendingChanges()) {
				// get user confirmation first
				this._showConfirmQuitChanges();
			} else {
				this.getModel("appView").setProperty("/addEnabled", true);
				// cancel without confirmation
				this._navBack();
			}
		},

		/* =========================================================== */
		/* Internal functions
		/* =========================================================== */
		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Details page
		 * @private
		 */
		_navBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			this.getView().unbindObject();
			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				this.getRouter().getTargets().display("object");
			}
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the quit and discard of changes.
		 * @private
		 */
		_showConfirmQuitChanges: function() {
			var oComponent = this.getOwnerComponent(),
				oModel = this.getModel();
			var that = this;
			MessageBox.confirm(
				this._oResourceBundle.getText("confirmCancelMessage"), {
					styleClass: oComponent.getContentDensityClass(),
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							that.getModel("appView").setProperty("/addEnabled", true);
							oModel.resetChanges();
							that._navBack();
						}
					}
				}
			);
		},

		/**
		 * Prepares the view for editing the selected object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */
		_onEdit: function(oEvent) {
			//default expanded of Panel
			this.byId("Panel1").setExpanded(false);
			this.byId("Panel2").setExpanded(false);
			this.byId("Panel3").setExpanded(false);
			this.byId("Panel4").setExpanded(false);

			var oData = oEvent.getParameter("data"),
				oView = this.getView();
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/enableCreate", true);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("editViewTitle"));

			oView.bindElement({
				path: oData.objectPath
			});
		},

		/**
		 * Prepares the view for creating new object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */

		_onCreate: function(oEvent) {
			// if (oEvent.getParameter("name") && oEvent.getParameter("name") !== "create") {
			// 	this._oViewModel.setProperty("/enableCreate", false);
			// 	this.getRouter().getTargets().detachDisplay(null, this._onDisplay, this);
			// 	this.getView().unbindObject();
			// 	return;
			// }

			// this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createViewTitle"));
			// this._oViewModel.setProperty("/mode", "create");
			// var oContext = this._oODataModel.createEntry("ZOPP_GET_LISTSet", {
			// 	success: this._fnEntityCreated.bind(this),
			// 	error: this._fnEntityCreationFailed.bind(this)
			// });
			// this.getView().setBindingContext(oContext);
		},

		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function() {
			var aInputControls = this._getFormFields(this.byId("newEntityForm1"));
			var oControl;
			var sControlType;
			for (var m = 0; m < aInputControls.length; m++) {
				oControl = aInputControls[m].control;
				if (aInputControls[m].required) {
					sControlType = oControl.getMetadata().getName();
					var sValue;
					if (sControlType === "sap.m.Select") {
						sValue = oControl.getSelectedKey();
					} else {
						sValue = oControl.getValue();
					}

					if (!sValue) {
						this._oViewModel.setProperty("/enableCreate", false);
						return;
					}
				}
			}
			this._checkForErrorMessages();
		},

		/**
		 * Checks if there is any wrong inputs that can not be saved.
		 * @private
		 */

		_checkForErrorMessages: function() {
			var aMessages = this._oBinding.oModel.oData;
			if (aMessages.length > 0) {
				var bEnableCreate = true;
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						bEnableCreate = false;
						break;
					}
				}
				this._oViewModel.setProperty("/enableCreate", bEnableCreate);
			} else {
				this._oViewModel.setProperty("/enableCreate", true);
			}
		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		_fnUpdateSuccess: function() {
			this.getModel("appView").setProperty("/busy", false);
			this.getView().unbindObject();
			this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function(oData) {
			var sObjectPath = this.getModel().createKey("ZOPP_GET_LISTSet", oData);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnEntityCreationFailed: function(oError) {
			if (oError && oError.responseText) {
				var aMockMessages = [],
					Body = JSON.parse(oError.responseText),
					array = Body.error.innererror.errordetails;
				if (Body.error.code !== "ZFIORI/000") {
					aMockMessages.push({
						type: "Error",
						title: Body.error.code
					});
				}

				for (var i = 0; i < array.length; i++) {
					if (array[i].code.split("/")[0] !== "ZFIORI") {
						continue;
					}
					switch (array[i].severity) {
						case "info":
							{
								array[i].severity = "Information";
								break;
							}
						case "error":
							{
								array[i].severity = "Error";
								break;
							}
						case "warning":
							{
								array[i].severity = "Warning";
								break;
							}
					}
					aMockMessages.push({
						type: array[i].severity,
						title: array[i].message
					});
				}
				var oMsgModel = new JSONModel();
				oMsgModel.setData(aMockMessages);
				oMessagePopover.setModel(oMsgModel);
				this._oViewModel.setProperty("/messageCount", aMockMessages.length);
				this.byId("Message").setVisible(true);
			}
			this.getModel("appView").setProperty("/busy", false);
		},

		/**
		 * Handles the onDisplay event which is triggered when this view is displayed 
		 * @param {sap.ui.base.Event} oEvent the on display event
		 * @private
		 */
		_onDisplay: function(oEvent) {
			//隐藏报错消息按钮
			this.byId("Message").setVisible(false);

			var oData = oEvent.getParameter("data");
			if (oData && oData.mode === "update") {
				this._onEdit(oEvent);
			} else {
				this._onCreate(oEvent);
			}
			if (oData && oData.mode === "update") {
				//  initialization the table of product item
				var oModelJson1 = new sap.ui.model.json.JSONModel();
				this.setModel(oModelJson1, "tableView1");
				this.path = oData.objectPath;
				var url = this.path + "/ZOPP_ITEMSet";
				this._oODataModel.read(url, {
					success: function(oData1, response) {
						oModelJson1.setData(oData1);
					},
					error: function(response) {
						//  alert("Error");
					}
				});

				//  initialization the table of PartnerFct item
				var oModelJson2 = new sap.ui.model.json.JSONModel();
				this.setModel(oModelJson2, "tableView2");
				var url2 = this.path + "/ZOPP_PARTNERSet";
				this._oODataModel.read(url2, {
					success: function(oData2, response) {
						oModelJson2.setData(oData2);
					},
					error: function(response) {
						//  alert("Error");
					}
				});
			}
		},

		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @private
		 */
		_getFormFields: function(oSimpleForm) {
			var aControls = [];
			var aFormContent = oSimpleForm.getContent();
			var sControlType;
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" || sControlType === "sap.m.DatePicker" || sControlType === "sap.m.Select" ||
					sControlType === "sap.m.CheckBox") {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i - 1].getRequired && aFormContent[i - 1].getRequired()
					});
				}
			}
			return aControls;
		},
		/**
		 * remove product line
		 * @param {sap.ui.layout.form} oEvent the on DELETE event
		 * @private
		 */
		onRemovePartner: function(oEvent) {
			var sPath = oEvent.getSource().getBindingContext("tableView2").getPath();
			var oModel = this.getModel("tableView2");
			var fnDelete = function() {
				var idx = sPath.charAt(sPath.lastIndexOf("/") + 1);
				if (idx !== -1) {
					var data = oModel.getData();
					var removed = data.results.splice(idx, 1);
					oModel.setData(data);
				}
			}.bind(this);

			var alertText = this._oResourceBundle.getText("deletePartnerText");
			var alertConfirm = this._oResourceBundle.getText("confirm");
			var alertCancel = this._oResourceBundle.getText("cancel");

			var dialog = new Dialog({
				title: alertConfirm,
				type: "Message",
				content: new Text({
					text: alertText
				}),
				beginButton: new Button({
					text: alertConfirm,
					press: function() {
						fnDelete();
						dialog.close();
					}
				}),
				endButton: new Button({
					text: alertCancel,
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		/**
		 * remove product line
		 * @param {sap.ui.layout.form} oEvent the on DELETE event
		 * @private
		 */
		onRemoveProduct: function(oEvent) {
			var sPath = oEvent.getSource().getBindingContext("tableView1").getPath();
			var oModel = this.getModel("tableView1");
			var fnDelete = function() {
				var idx = sPath.charAt(sPath.lastIndexOf("/") + 1);
				if (idx !== -1) {
					var data = oModel.getData();
					var removed = data.results.splice(idx, 1);
					oModel.setData(data);
				}
			};

			var alertText = this._oResourceBundle.getText("deleteProductText");
			var alertConfirm = this._oResourceBundle.getText("confirm");
			var alertCancel = this._oResourceBundle.getText("cancel");

			var dialog = new Dialog({
				title: alertConfirm,
				type: "Message",
				content: new Text({
					text: alertText
				}),
				beginButton: new Button({
					text: alertConfirm,
					press: function() {
						fnDelete();
						dialog.close();
					}
				}),
				endButton: new Button({
					text: alertCancel,
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		/**
		 * search help for product
		 * @param {sap.ui.layout.form} oEvent the on Add event
		 * @private
		 */
		onAddProduct: function(oEvent) {
			this.sInputValue = this.getView().byId("Zzfld00002a_id").getSelectedKey();
			if (this.sInputValue !== "") {
				// create value help dialog
				if (!this._productHelpDialog) {
					this._productHelpDialog = sap.ui.xmlfragment("com.mindray.oppprt.view.Product", this);
					this.getView().addDependent(this._productHelpDialog);
				}
				// create a filter for the binding
				this._productHelpDialog.getBinding("items").filter([new Filter("SalesGroup", sap.ui.model.FilterOperator.EQ, this.sInputValue)]);
				// open value help dialog 
				this._productHelpDialog.open();
			}
		},

		_productValueHelpSearch: function(evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter("SalesGroup", sap.ui.model.FilterOperator.EQ, this.sInputValue);
			var oFilter2 = new Filter("ProductId", sap.ui.model.FilterOperator.Contains, sValue);
			evt.getSource().getBinding("items").filter([oFilter, oFilter2]);
		},
		_productValueHelpClose: function(evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var sProductId = oSelectedItem.getTitle(),
					sHierarchyId = oSelectedItem.getInfo(),
					sPrice = oSelectedItem.getDescription();
				var obj = {
					ProdHierarchy: sHierarchyId,
					ProdHierDescr: sProductId,
					NetValueMan: "",
					ZzconfNote: "",
					Zzfld0000f4: "",
					ZzContacter: "",
					Zzfld0000gg: "",
					ZzSdtype: "",
					ItemNum: "",
					Price: sPrice
				};
				var model = this.getView().getModel("tableView1");
				var data2 = model.getData();
				data2.results.push(obj);
				model.setData(data2);
			}
		},

		/**
		 * insert a row in partnerFct table
		 * @param {sap.ui.layout.form} oEvent the on Add event
		 * @private
		 */
		onAddPartner: function(oEvent) {
			// create  the dialog
			if (!this._selectPartnerDialog) {
				this._selectPartnerDialog = sap.ui.xmlfragment("com.mindray.oppprt.view.SelectPartner", this);
				this.getView().addDependent(this._selectPartnerDialog);
				// forward compact/cozy style into Dialog
				this._selectPartnerDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}
			// open value help dialog 
			this._selectPartnerDialog.open();
		},
		onDialogClose: function(oAction) {
			this._selectPartnerDialog.close();
		},
		onConfirmDialog: function(oEvent) {
			var btngroup = sap.ui.getCore().byId("radioButton_id");
			var btnid = btngroup.getSelectedButton().getId();

			if (btnid) {
				var obj = {
					"PartnerFct": btnid,
					"McName1": "",
					"NoteLanguage": "",
					"PartnerNo1": ""
				};
				var model = this.getView().getModel("tableView2");
				var data = model.getData();
				data.results.push(obj);
				model.setData(data);
			}
			this._selectPartnerDialog.close();
		},

		/**
		 * search help for partner function
		 * @param {sap.ui.layout.form} oEvent the on edit event
		 * @private
		 */
		partnerValueHelp: function(oEvent) {
			var source = oEvent.getSource();
			var sInputValue = source.getValue();
			var parent = source.getParent();
			var cell0 = parent.getCells()[0];
			var cell2 = parent.getCells()[2];
			var sPartnerFct = cell0.getProperty('selectedKey');

			this.partnerFct = sPartnerFct;
			this.parentId = cell2;
			this.inputId = oEvent.getSource().getId();
			// create value help dialog
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(
					"com.mindray.oppprt.view.PartnerFCT",
					this
				);
				this.getView().addDependent(this._valueHelpDialog);
			}

			// create a filter for the binding
			if (sInputValue !== "") {
				this._valueHelpDialog.getBinding("items").filter([
					new sap.ui.model.Filter("NameOrg1", sap.ui.model.FilterOperator.Contains, sInputValue),
					new sap.ui.model.Filter("Partner", sap.ui.model.FilterOperator.EQ, sPartnerFct)
				]);
			}
			this._valueHelpDialog.open(sInputValue);
		},

		_partnerValueHelpSearch: function(evt) {
			var sValue = evt.getParameter("value");
			if (sValue !== "") {
				evt.getSource().getBinding("items").filter([
					new sap.ui.model.Filter("NameOrg1", sap.ui.model.FilterOperator.Contains, sValue),
					new sap.ui.model.Filter("Partner", sap.ui.model.FilterOperator.EQ, this.partnerFct)
				]);
			}

		},

		_partnerValueHelpClose: function(evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var partnerInput = this.getView().byId(this.inputId),
					sPartnerId = oSelectedItem.getDescription(),
					sPartnerName = oSelectedItem.getTitle();

				partnerInput.setValue(sPartnerName);
				this.parentId.setProperty('text', sPartnerId);
			}
			evt.getSource().getBinding("items").filter([]);
		},

		_getOdata: function() {
			var othisModel = this.getModel(),
				headerObj = othisModel.getProperty(this.path + "/ZOPP_HEADER");
			var requestORderHeader = {};
			requestORderHeader.Guid = headerObj.Guid;
			// Create header data
			var oMemo = this.getView().byId("memo_id").getValue();
			oMemo = oMemo.substr(0, 40);
			var headerDate = {
				Guid: requestORderHeader.Guid,
				ObjectId: headerObj.ObjectId,
				Description: headerObj.Description,
				Zzfld00002a: this.getView().byId("Zzfld00002a_id").getSelectedKey(),
				Source: this.getView().byId("source_id").getSelectedKey(),
				CurrPhase: this.getView().byId("currPhase_id").getSelectedKey(),
				Probability: this.getView().byId("probability_id").getValue(),
				StatUser: this.getView().byId("statUser_id").getSelectedKey(),
				Memo: oMemo,
				ExpectEnd: this._timesTamp(this.getView().byId("expectEnd_id").getValue()),
				Zzfld00001g: this._timesTamp(this.getView().byId("zzfld00001g_id").getValue()),
				NetValueMan: headerObj.NetValueMan,
				Currency: headerObj.Currency,
				ZzprodLine: headerObj.ZzprodLine
					// Partner: ""
			};

			// Create ZOPP_ANALYSIS data
			var Zzfldb8 = this.getView().byId("zzfld0000b8_id").getValue();
			var analysisDate = {
				Guid: requestORderHeader.Guid,
				Listcode: this.getView().byId("listCode_id").getSelectedKey(),
				Zzfld00006b: this.getView().byId("zzfld00006b_id").getValue(),
				Zzfld00004u: this.getView().byId("zzfld00004u_id").getValue(),
				Zzfld00004t: this.getView().byId("zzfld00004t_id").getValue(),
				Zzfld0000b8: Zzfldb8 ? Zzfldb8 : "0.00"
					// Currency: ""
			};
			//  Create item data
			var model = this.getView().getModel("tableView1"),
				itemData = [];
			var items = model.getData().results;
			for (var i = 0; i < items.length; i++) {
				itemData.push({
					Header: requestORderHeader.Guid,
					Guid: items[i].Guid ? items[i].Guid : this._createGuid(),
					ProdHierarchy: items[i].ProdHierarchy,
					NumberInt: items[i].NumberInt,
					ProdHierDescr: items[i].ProdHierDescr,
					ItemNum: items[i].ItemNum,
					Unit: items[i].Unit,
					NetValueMan: items[i].NetValueMan,
					Currency: items[i].Currency,
					ZzconfNote: items[i].ZzconfNote,
					Zzfld0000f4: items[i].Zzfld0000f4,
					ZzSdtype: items[i].ZzSdtype,
					ZzContacter: items[i].ZzContacter,
					Zzfld0000gg: items[i].Zzfld0000gg,
					ZzStatusZj: items[i].ZzStatusZj
				});
			}
			//  Create partner data
			var model2 = this.getView().getModel("tableView2"),
				items2 = model2.getData().results;
			var partnerDate = [];
			for (i = 0; i < items2.length; i++) {
				partnerDate.push({
					Guid: requestORderHeader.Guid,
					PartnerFct: items2[i].PartnerFct,
					PartnerNo1: items2[i].PartnerNo1,
					McName1: items2[i].McName1,
					SmtpAddr: items2[i].SmtpAddr,
					TelNumber: items2[i].TelNumber
				});
			}

			requestORderHeader.ZOPP_ITEMSet = itemData;
			requestORderHeader.ZOPP_ANALYSIS = analysisDate;
			requestORderHeader.ZOPP_HEADER = headerDate;
			requestORderHeader.ZOPP_PARTNERSet = partnerDate;
			return requestORderHeader;
		},
		//Error message popver
		handleMessagePopoverPress: function(oEvent) {
			oMessagePopover.openBy(oEvent.getSource());
		},
		_createGuid: function() {
			return "11111111-1111-1111-1111-111111111111";
			// return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
			// 	var r = Math.random() * 16 | 0,
			// 		v = c === "x" ? r : (r & 0x3 | 0x8);
			// 	return v.toString(16);
			// });
		},
		// return Unix timestamp 
		_timesTamp: function(inputDate) {
			var date = inputDate + " " + "08:00:00";
			var d = new Date(date);
			var miseconds = d.getTime();
			var outputDate = "\/Date(" + miseconds + ")\/";
			return outputDate;
		},
		// return a model
		_createoModel: function() {
			var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZSALE_ODATA_01_SRV/", true);
			return oModel;
		},
		/**
		 * check before creating/updating an object
		 * @private
		 */
		_checkBeforeSave: function() {
			var aMockMessages = [],
				i;
			var model = this.getView().getModel("tableView1");
			var items = model.getData().results;
			//行项目：销售组为100、110的，配置、科室、联系人、电话为必填项	
			var sZzfld00002a = this.getView().byId("Zzfld00002a_id").getSelectedKey(),
				errorItemText = this._oResourceBundle.getText("errorItemText"),
				errorItemText2 = this._oResourceBundle.getText("errorItemText2");
			if (sZzfld00002a === "100" || sZzfld00002a === "110") {
				for (i = 0; i < items.length; i++) {
					if (items[i].ZzconfNote === "" || items[i].Zzfld0000f4 === "" || items[i].ZzContacter === "" || items[i].Zzfld0000gg === "") {
						aMockMessages.push({
							type: "Error",
							title: errorItemText
						});
					}
				}
			}
			//行项目：销售组是 200/210/220/300/310/320，销售类型必填。
			if (sZzfld00002a === "200" || sZzfld00002a === "210" || sZzfld00002a === "220" || sZzfld00002a === "300" ||
				sZzfld00002a === "310" || sZzfld00002a === "320") {
				for (i = 0; i < items.length; i++) {
					if (items[i].ZzSdtype === "") {
						aMockMessages.push({
							type: "Error",
							title: errorItemText2
						});
					}
				}
			}
			//第4阶段(商机阶段:ZP4/ZP5)以后，交易渠道商为必填项。
			//修改保存时，如果：ZMR00005 为空的不能保存。
			var falgPartner;
			var falgZmr00007;
			var falgZmr00005;
			var sCurrPhase = this.getView().byId("currPhase_id").getSelectedKey(),
				errorPartnerText = this._oResourceBundle.getText("errorPartnerText"),
				errorPartner005Text = this._oResourceBundle.getText("errorPartner005Text"),
				errorPartnerNullText = this._oResourceBundle.getText("errorPartnerNullText");
			var model2 = this.getView().getModel("tableView2");
			var item2 = model2.getData().results;
			for (i = 0; i < item2.length; i++) {
				if (item2[i].PartnerNo1 === "") {
					falgPartner = true;
				}
				if (item2[i].PartnerFct === "ZMR00005") {
					falgZmr00005 = true;
				}
				if (item2[i].PartnerFct === "ZMR00007") {
					falgZmr00007 = true;
				}
			}
			if (falgPartner) {
				aMockMessages.push({
					type: "Error",
					title: errorPartnerNullText
				});
			}
			if (!falgZmr00005) {
				aMockMessages.push({
					type: "Error",
					title: errorPartner005Text
				});
			}
			if (!falgZmr00007 && (sCurrPhase === "ZP4" || sCurrPhase === "ZP5")) {
				aMockMessages.push({
					type: "Error",
					title: errorPartnerText
				});
			}

			//丢单时，输赢分析必填
			var statUser = this.getView().byId("statUser_id").getSelectedKey(),
				errorAnalysisNullText = this._oResourceBundle.getText("errorAnalysisNullText");
			var Zzfldb8 = this.getView().byId("zzfld0000b8_id").getValue(),
				Listcode = this.getView().byId("listCode_id").getSelectedKey(),
				Zzfld00006b = this.getView().byId("zzfld00006b_id").getValue(),
				Zzfld00004u = this.getView().byId("zzfld00004u_id").getValue(),
				Zzfld00004t = this.getView().byId("zzfld00004t_id").getValue();
			if (statUser === "E0004" && (Zzfldb8 === "" || Listcode === "" || Zzfld00006b === "" ||
					Zzfld00004u === "" || Zzfld00004t === "")) {
				aMockMessages.push({
					type: "Error",
					title: errorAnalysisNullText
				});
			}

			//填充消息
			if (aMockMessages.length > 0) {
				var oMsgModel = new JSONModel();
				oMsgModel.setData(aMockMessages);
				oMessagePopover.setModel(oMsgModel);
				this._oViewModel.setProperty("/messageCount", aMockMessages.length);
				this.byId("Message").setVisible(true);
				return true;
			} else {
				return false;
			}
		},
		/**
		 * 商机阶段为已签单，默认状态为赢单；
		 * @private
		 */
		_setDefaultValue: function() {
			var sCurrPhase = this.getView().byId("currPhase_id").getSelectedKey();
			if (sCurrPhase === "ZP5") {
				this.getView().byId("statUser_id").setSelectedKey("E0003");
			}
			this._validateSaveEnablement();
		},
		/**
		 * 商机阶段为已签单，默认状态为赢单；
		 * @private
		 */
		_statUserChanged: function() {
			var statUser = this.getView().byId("statUser_id").getSelectedKey();
			if (statUser === "E0004") {
				this.byId("Panel2").setVisible(true);
			} else {
				this.byId("Panel2").setVisible(false);
			}
			this._validateSaveEnablement();
		},
		/**
		 * 自动计算：总价= 单价 * 数量
		 * @private
		 */
		_validateCalculatePrice: function(oEvent) {
			var source = oEvent.getSource();
			var sNum = source.getValue(); //数量
			var parent = source.getParent();
			var sPrice = parent.getCells()[9].getProperty("value"); //单价 
			var cell2 = parent.getCells()[2]; //总价 
			if (sPrice !== "0.00") {
				var total = sPrice * sNum;
				cell2.setValue(total);
			}
		}

	});

});