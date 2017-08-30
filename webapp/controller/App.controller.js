sap.ui.define([
	"com/mindray/oppprt/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";
	return BaseController.extend("com.mindray.oppprt.controller.App", {

		onInit: function() {
			//隐藏lanuchPad 抬头
			$("#shell-hdr").hide();
			$("#shell-cntnt").css("top", "0px");
			
			var oViewModel,
				fnSetAppNotBusy,
				oListSelector = this.getOwnerComponent().oListSelector,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				itemToSelect: null,
				addEnabled: false

			});
			this.setModel(oViewModel, "appView");
			//create a jsonmodel for the partnerFCT  
			var oModelJson = new sap.ui.model.json.JSONModel({
				items: [{
					key: "ZMR00005",
					value: "独家渠道商"
				}, {
					key: "ZMR00006",
					value: "商机来源渠道商"
				}, {
					key: "ZMR00007",
					value: "交易渠道商"
				}]
			});
			this.setModel(oModelJson, "partnerView");

			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			this.getOwnerComponent().getModel().metadataLoaded()
				.then(fnSetAppNotBusy);

			// Makes sure that master view is hidden in split app
			// after a new list entry has been selected.
			oListSelector.attachListSelectionChange(function() {
				this.byId("idAppControl").hideMaster();
			}, this);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
		}
	});

});