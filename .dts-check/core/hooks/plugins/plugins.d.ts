/** Convenience wrappers, matching the per-domain shape of the other hook modules. */
export declare const usePluginInstallations: () => {
    installations: import("../../types/plugins").PluginInstallation[];
    isLoading: boolean;
    isError: any;
};
export declare const usePluginUserSettings: () => {
    userSettings: import("../../types/plugins").PluginUserSetting[];
    isLoading: boolean;
    isError: any;
};
/** The write functions, for the plugins page's actions port. */
export declare const usePluginActions: () => {
    setInstallation(pluginId: string, patch: Partial<import("../../types/plugins").PluginInstallation>): Promise<void>;
    removeInstallation(pluginId: string): Promise<void>;
    setUserSetting(pluginId: string, patch: Partial<import("../../types/plugins").PluginUserSetting>): Promise<void>;
};
//# sourceMappingURL=plugins.d.ts.map