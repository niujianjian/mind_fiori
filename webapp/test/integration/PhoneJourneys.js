jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/mindray/oppprt/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/mindray/oppprt/test/integration/pages/App",
	"com/mindray/oppprt/test/integration/pages/Browser",
	"com/mindray/oppprt/test/integration/pages/Master",
	"com/mindray/oppprt/test/integration/pages/Detail",
	"com/mindray/oppprt/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.mindray.oppprt.view."
	});

	sap.ui.require([
		"com/mindray/oppprt/test/integration/NavigationJourneyPhone",
		"com/mindray/oppprt/test/integration/NotFoundJourneyPhone",
		"com/mindray/oppprt/test/integration/BusyJourneyPhone"
	], function() {
		QUnit.start();
	});
});