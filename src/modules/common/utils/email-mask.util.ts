export function maskEmail(email: string): string {
  if (!email) return email;

  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return email;

  // Mask local part: keep first char, mask rest with 5 asterisks (or fewer if short)
  const maskedLocal =
    localPart.length > 1
      ? localPart[0] + '*'.repeat(5)
      : localPart + '*'.repeat(5);

  const [domainName, tld] = domainPart.split('.');
  
  // Mask domain name: keep first char, mask rest
  let maskedDomainName = domainName;
  if (domainName && domainName.length > 1) {
    maskedDomainName = domainName[0] + '*'.repeat(3);
  }

  // Mask TLD: keep first char, mask middle, keep last char if long enough
  let maskedTld = tld;
  if (tld && tld.length > 1) {
      if (tld.length > 2) {
          maskedTld = tld[0] + '*' + tld[tld.length - 1];
      } else {
          maskedTld = tld[0] + '*';
      }
  }

  return `${maskedLocal}@${maskedDomainName}.${maskedTld}`;
}

