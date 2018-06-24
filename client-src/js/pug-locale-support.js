(() => {
  "use strict";

  /**
   * Adds support for locales into pug templates
   */
  window.pugLocaleSupport = () => {
    const currentLocale = $("body").attr("data-current-locale");
    const result = {
      currentLocale: currentLocale,
      _L: (localizedValues, type) => {
        if (!localizedValues) {
          return "Locale entry not found"
        }
  
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