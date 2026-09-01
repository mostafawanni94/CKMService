"""
VAT treatment codes and Dutch BTW return boxes.

Kept in one place so no VAT rule is expressed as `if rate == 21` anywhere else
in the codebase.
"""

from django.db import models


class VatTreatmentCode(models.TextChoices):
    """How a transaction is treated for VAT."""

    NORMAL = 'NORMAL', 'Normal (VAT charged)'
    VAT_INCLUDED = 'VAT_INCLUDED', 'Normal, price includes VAT'
    REVERSE_CHARGE = 'REVERSE_CHARGE', 'Reverse charge (btw verlegd)'
    ZERO_RATE = 'ZERO_RATE', 'Zero rated (0%)'
    EXEMPT = 'EXEMPT', 'Exempt (vrijgesteld)'
    OUT_OF_SCOPE = 'OUT_OF_SCOPE', 'Outside the scope of VAT'
    UNKNOWN = 'UNKNOWN', 'Unknown — requires review'
    MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', 'Manual adjustment'


class PriceMode(models.TextChoices):
    """
    Whether the agreed amount includes VAT.

    Never inferred. "The customer paid EUR 38" is not evidence that 38 is the
    net amount, and treating it as such silently changes the VAT owed.
    """

    EXCLUDING_VAT = 'EXCLUDING_VAT', 'Price excludes VAT'
    INCLUDING_VAT = 'INCLUDING_VAT', 'Price includes VAT'


class VatDirection(models.TextChoices):
    OUTPUT = 'OUTPUT', 'Output VAT (sales)'
    INPUT = 'INPUT', 'Input VAT (purchases)'


class ClassificationStatus(models.TextChoices):
    """
    The confidence of a classification.

    UNKNOWN is a real state, not a fallback. A transaction whose treatment
    cannot be established stays REQUIRES_REVIEW — it is never quietly filed as
    0%, exempt, or 21%.
    """

    CLASSIFIED = 'CLASSIFIED', 'Classified'
    REQUIRES_REVIEW = 'REQUIRES_REVIEW', 'Requires review'
    MANUALLY_RESOLVED = 'MANUALLY_RESOLVED', 'Manually resolved'


# The Dutch BTW return sections, verified against Belastingdienst guidance.
# There is deliberately no 5g: the payable/refundable figure is derived as
# 5a - 5b, it is not a box anyone fills in.
RETURN_BOXES = [
    ('1a', 'Leveringen/diensten belast met hoog tarief', VatDirection.OUTPUT),
    ('1b', 'Leveringen/diensten belast met laag tarief', VatDirection.OUTPUT),
    ('1c', 'Leveringen/diensten belast met overige tarieven behalve 0%', VatDirection.OUTPUT),
    ('1d', 'Privegebruik', VatDirection.OUTPUT),
    ('1e', 'Leveringen/diensten belast met 0% of niet bij u belast', VatDirection.OUTPUT),
    ('2a', 'Verleggingsregelingen binnenland', VatDirection.OUTPUT),
    ('3a', 'Leveringen naar landen buiten de EU (uitvoer)', VatDirection.OUTPUT),
    ('3b', 'Leveringen naar of diensten in landen binnen de EU', VatDirection.OUTPUT),
    ('3c', 'Installatie/afstandsverkopen binnen de EU', VatDirection.OUTPUT),
    ('4a', 'Leveringen/diensten uit landen buiten de EU', VatDirection.OUTPUT),
    ('4b', 'Leveringen/diensten uit landen binnen de EU', VatDirection.OUTPUT),
    ('5a', 'Verschuldigde omzetbelasting', VatDirection.OUTPUT),
    ('5b', 'Voorbelasting', VatDirection.INPUT),
]

#: Boxes whose value is computed from the others rather than fed by transactions.
COMPUTED_BOXES = {'5a', '5b'}

#: Never emit this as a return box. It appeared in a legacy Excel export as a
#: label for "Af te dragen / Terug te vragen"; it is not a rubriek.
FORBIDDEN_BOX_CODES = {'5g'}


class VatPeriodStatus(models.TextChoices):
    """
    Lifecycle of a filing period.

    OPEN is the working state; the status is derived from the ledger rather than
    set by hand, so a period cannot claim to be ready while something is
    unresolved.
    """

    OPEN = 'OPEN', 'Open'
    REVIEW_REQUIRED = 'REVIEW_REQUIRED', 'Review required'
    READY_TO_FINALIZE = 'READY_TO_FINALIZE', 'Ready to finalize'
    FINALIZED = 'FINALIZED', 'Finalized'
    LOCKED = 'LOCKED', 'Locked'

    # Retained so periods stored under the earlier naming stay valid.
    DRAFT = 'DRAFT', 'Draft (legacy)'
    CALCULATED = 'CALCULATED', 'Calculated (legacy)'
    REVIEWED = 'REVIEWED', 'Reviewed (legacy)'


#: A period in one of these states may no longer be recalculated in place.
CLOSED_PERIOD_STATUSES = {VatPeriodStatus.FINALIZED, VatPeriodStatus.LOCKED}

#: Bumped whenever the classification rules change, so a historical entry stays
#: explainable under the rules that produced it.
VAT_RULES_VERSION = '2026.1'
