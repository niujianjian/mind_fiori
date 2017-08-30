jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 ZOPP_GET_LISTSet in the list
// * All 3 ZOPP_GET_LISTSet have at least one ZOPP_ANALYSIS

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/mindray/oppprt/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/mindray/oppprt/test/integration/pages/App",
	"com/mindray/oppprt/test/integration/pages/Browser",
	"com/mindray/oppprt/test/integration/pages/Master",
	"com/mindray/oppprt/test/integration/pages/Detail",
	"com/mindray/oppprt/test/integration/pages/Create",
	"com/mindray/oppprt/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.mindray.oppprt.view."
	});

	sap.ui.require([
		"com/mindray/oppprt/test/integration/MasterJourney",
		"com/mindray/oppprt/test/integration/NavigationJourney",
		"com/mindray/oppprt/test/integration/NotFoundJourney",
		"com/mindray/oppprt/test/integration/BusyJourney",
		"com/mindray/oppprt/test/integration/FLPIntegrationJourney"
	], function() {
		QUnit.start();
	});
});