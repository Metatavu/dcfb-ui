exports._L = (localizedValues, type, req) => {
  if (!localizedValues) {
    return "Locale entry not found"
  }

  const desiredLocale = req.getLocale();
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

exports._LS = (localizedValues, req) => {
  return exports._L(localizedValues, "SINGLE", req);
};

exports._LP = (localizedValues, req) => {
  return exports._L(localizedValues, "PLURAL", req);
};