from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pypdf import PdfReader
from services.openai_service import generate_cover_letter

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


def build_cover_letter_prompt(resume_text: str, job_description: str, company_name: str) -> str:
    """Build the prompt payload for a future AI generation step."""
    return (
        "You are an expert career assistant. Write a tailored cover letter. Make it concise and professional while sounding human and not robotic. Avoid using generic phrases or templates as well as em dashes.\n\n"
        f"Company Name:\n{company_name}\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Candidate Resume:\n{resume_text}\n"
    )


def prepare_generation_input(resume_text: str, job_description: str, company_name: str) -> str:
    """Preparation layer to keep AI generation integration simple."""
    return build_cover_letter_prompt(
        resume_text=resume_text,
        job_description=job_description,
        company_name=company_name,
    )


@router.post("/generate")
async def generate_cover_letter_route(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    company_name: str = Form(...),
):
    resume_bytes = await resume.read()
    resume_text = extract_resume_text(resume_bytes)
    prompt = prepare_generation_input(
        resume_text=resume_text,
        job_description=job_description,
        company_name=company_name,
    )

    cover_letter = generate_cover_letter(prompt)

    return {
        "cover_letter": cover_letter
    }
