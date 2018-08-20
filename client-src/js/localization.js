(() => {
  "use strict";

  const SUPPORTED_LOCALES = ["en", "fi"];

  window.getCurrentLocale = () => {
    return $("body").attr("data-current-locale");
  }

  window.getLocalized = (localizedValues, type) => {
    if (!localizedValues) {
      return "Locale entry not found"
    }

    const currentLocale = getCurrentLocale();
    const desiredLocale = currentLocale;
    const typeMatches = localizedValues.filter((localizedValue) => {
      return localizedValue.type === type; 
    });

    const desiredMatches = typeMatches.filter((typeMatch) => {
      return typeMatch.language === desiredLocale;
    });

    if (desiredMatches.length === 1) {
      return desiredMatches[0].value;
    }

    typeMatches.sort((typeMatch) => {
      const localeIndex = SUPPORTED_LOCALES.indexOf(typeMatch.language);
      return localeIndex === -1 ? Number.MAX_SAFE_INTEGER : localeIndex;
    });

    return typeMatches.length ? typeMatches[0].value : "";
  };

  /**
   * Returns value by provided locale and type
   */
  window.getValueByLocaleAndType = (localizedValues, locale, type) => {
    const typeMatches = localizedValues.filter((localizedValue) => {
      return localizedValue.type === type; 
    });

    const desiredMatches = typeMatches.filter((typeMatch) => {
      return typeMatch.language === locale;
    });
    
    return desiredMatches.length ? desiredMatches[0].value : "";
  };

  /**
   * Adds support for locales into pug templates
   */
  window.pugLocaleSupport = () => {
    const currentLocale = getCurrentLocale();
    const result = {
      currentLocale: currentLocale,
      _L: (localizedValues, type) => {
        return getLocalized(localizedValues, type);
      },
      _LS: (localizedValues) => {
        return result._L(localizedValues, "SINGLE");
      },
      _LP: (localizedValues) => {
        return result._L(localizedValues, "PLURAL");
      }
    };

    return result;
  };

})();