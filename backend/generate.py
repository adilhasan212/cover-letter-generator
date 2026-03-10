from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter()

@router.post("/generate")
async def generate_cover_letter(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    company_name: str = Form(...)
):
    return {
        "message": "Endpoint working",
        "filename": resume.filename,
        "company": company_name
    }