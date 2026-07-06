export function getStorageErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Impossible d'accéder au stockage S3. Vérifiez la configuration AWS.";
  }

  const err = error as { name?: string; Code?: string; message?: string };
  const code = err.Code ?? err.name ?? "";

  switch (code) {
    case "InvalidAccessKeyId":
      return "Clé AWS invalide — vérifiez AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY dans .env.local.";
    case "SignatureDoesNotMatch":
      return "Secret AWS incorrect — vérifiez AWS_SECRET_ACCESS_KEY.";
    case "NoSuchBucket":
      return "Bucket S3 introuvable — vérifiez AWS_S3_BUCKET et la région AWS_REGION.";
    case "AccessDenied":
      return "Accès S3 refusé — l'utilisateur IAM doit avoir s3:ListBucket, s3:GetObject, s3:PutObject et s3:DeleteObject.";
    case "PermanentRedirect":
    case "AuthorizationHeaderMalformed":
      return "Région S3 incorrecte — vérifiez que AWS_REGION correspond à votre bucket.";
    default:
      if (err.message?.includes("AWS S3 is not configured")) {
        return "Stockage non configuré — ajoutez AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et AWS_S3_BUCKET.";
      }
      return "Impossible d'accéder au stockage S3. Vérifiez la configuration AWS.";
  }
}
