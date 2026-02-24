"""Survey input validation service.

Requirements: 2.2, 2.3, 10.4
"""

from typing import List, Tuple

from pydantic import ValidationError

from models.schemas import SurveyRequest

REQUIRED_FIELDS = ("name", "job_title", "strengths", "hobbies")


class SurveyValidationError(Exception):
    """Raised when survey validation fails."""

    def __init__(self, missing_fields: List[str], details: str = "") -> None:
        self.missing_fields = missing_fields
        self.details = details
        super().__init__(
            f"Validation failed for fields: {', '.join(missing_fields)}"
        )


def validate_survey(data: dict) -> SurveyRequest:
    """Validate raw survey input and return a SurveyRequest model.

    Checks that all required fields (name, job_title, strengths, hobbies)
    are present, non-empty, and not whitespace-only. Pydantic handles
    type coercion and constraint enforcement.

    Args:
        data: Raw dictionary from the API request body.

    Returns:
        Validated SurveyRequest instance.

    Raises:
        SurveyValidationError: When required fields are missing,
            empty, or whitespace-only.
    """
    missing: List[str] = []

    for field in REQUIRED_FIELDS:
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)

    if missing:
        raise SurveyValidationError(missing_fields=missing)

    try:
        return SurveyRequest(**data)
    except ValidationError as e:
        # Extract field names from Pydantic errors
        failed_fields = []
        for err in e.errors():
            loc = err.get("loc", ())
            if loc:
                failed_fields.append(str(loc[0]))
        raise SurveyValidationError(
            missing_fields=failed_fields or ["unknown"],
            details=str(e),
        ) from e
