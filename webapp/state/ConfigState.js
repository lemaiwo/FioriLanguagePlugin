sap.ui.define([
	"./BaseState",
	"../service/ConfigService"
], function (BaseState, ConfigService) {
	"use strict";

	return BaseState.extend("be.wl.fiori.lang.state.ConfigState", {
		CurrentLanguage: "EN", //put default on english
		constructor: function (oService, oComponent) {
			BaseState.call(this);
		},
		getCurrentLanguage: function () {
			return ConfigService.getLanguage().then(function (response) {
				this.CurrentLanguage = response.data.Value;
				this.updateModel();
				return this.CurrentLanguage;
			}.bind(this));
		},
		setCurrentLanguage: function (sLangu) {
			this.CurrentLanguage = sLangu;
			this.updateModel();
			return ConfigService.updateLanguage(sLangu);
		}
	});
});