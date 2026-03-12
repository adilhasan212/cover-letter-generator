from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pypdf import PdfReader

router = APIRouter()


def extract_resume_text(pdf_bytes: bytes) -> str:
    """Extract raw text from a PDF resume."""
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to parse resume PDF") from exc

    resume_text = "\n".join(pages_text).strip()
    if not resume_text:
        raise HTTPException(status_code=400, detail="No extractable text found in resume PDF")
    return resume_text


def build_cover_letter_prompt(
    resume_text: str,
    job_description: str,
    company_name: str,
    todays_date: str | None = None,
    job_location: str | None = None,
) -> str:
    """Build the prompt payload for a future AI generation step."""
    return (
        "You are an expert career assistant. Write a tailored cover letter.\n\n"
        f"Company Name:\n{company_name}\n\n"
        f"Today's Date:\n{todays_date or 'Not provided'}\n\n"
        f"Job Location:\n{job_location or 'Not provided'}\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Candidate Resume:\n{resume_text}\n"
    )


def prepare_generation_input(
    resume_text: str,
    job_description: str,
    company_name: str,
    todays_date: str | None = None,
    job_location: str | None = None,
) -> str:
    """Preparation layer to keep AI generation integration simple."""
    return build_cover_letter_prompt(
        resume_text=resume_text,
        job_description=job_description,
        company_name=company_name,
        todays_date=todays_date,
        job_location=job_location,
    )


@router.post("/generate")
async def generate_cover_letter(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    company_name: str = Form(...),
    todays_date: str | None = Form(None),
    job_location: str | None = Form(None),
):
    resume_bytes = await resume.read()
    resume_text = extract_resume_text(resume_bytes)
    prompt = prepare_generation_input(
        resume_text=resume_text,
        job_description=job_description,
        company_name=company_name,
        todays_date=todays_date,
        job_location=job_location,
    )

    return {
        "prompt": prompt,
    }
