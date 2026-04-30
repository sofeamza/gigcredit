from pydantic import BaseModel
from typing import Dict, List

class Explanation(BaseModel):
    score_id: str
    shap_values: Dict[str, float]
    natural_language_text: str
    improvement_tips: List[str]