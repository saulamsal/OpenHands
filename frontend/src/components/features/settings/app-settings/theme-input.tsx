import React from "react";
import { useTranslation } from "react-i18next";
import { Theme } from "#/types/settings";
import { SettingsDropdownInput } from "../settings-dropdown-input";
import { I18nKey } from "#/i18n/declaration";
import { useTheme } from "#/context/theme-context";

export function ThemeInput() {
  const { t } = useTranslation();
  const { userPreference, setTheme } = useTheme();

  const themeOptions = [
    { key: "auto", label: t(I18nKey.SETTINGS$THEME_AUTO) },
    { key: "light", label: t(I18nKey.SETTINGS$THEME_LIGHT) },
    { key: "dark", label: t(I18nKey.SETTINGS$THEME_DARK) },
  ];

  const handleSelectionChange = (key: React.Key | null) => {
    if (key && ["auto", "light", "dark"].includes(key.toString())) {
      setTheme(key.toString() as Theme);
    }
  };

  return (
    <SettingsDropdownInput
      testId="theme-input"
      name="theme-input"
      label={t(I18nKey.SETTINGS$THEME)}
      items={themeOptions}
      defaultSelectedKey={userPreference}
      onSelectionChange={handleSelectionChange}
      placeholder={t(I18nKey.SETTINGS$THEME_AUTO)}
    />
  );
}
