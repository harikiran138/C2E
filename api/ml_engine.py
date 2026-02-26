import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from typing import List
import os

class LocalMLEngine:
    def __init__(self, model_id: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        self.model_id = model_id
        self.tokenizer = None
        self.model = None
        self.pipe = None
        # Use MPS for Mac (Apple Silicon) if available, else CPU
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        # SERVERLESS SAFETY CHECK
        self.is_serverless = os.getenv("VERCEL") == "1"
        if self.is_serverless:
            print("DEBUG: Running in Serverless mode. Local ML disabled.")
        else:
            print(f"DEBUG: Initializing Dedicated Local ML on device: {self.device}")

    def load_model(self):
        if self.pipe or self.is_serverless:
            return
            
        print(f"DEBUG: Loading Dedicated Model {self.model_id}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
        
        # TinyLlama is small and fast in float16
        torch_dtype = torch.float16 if self.device != "cpu" else torch.float32
        
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            torch_dtype=torch_dtype,
            device_map="auto" if self.device != "cpu" else None
        )
        
        if self.device == "cpu":
            self.model = self.model.to(self.device)
            
        self.pipe = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            max_new_tokens=60,
            temperature=0.7,
            do_sample=True
        )
        print("DEBUG: Dedicated Local Model Loaded Successfully.")

    def generate_vision(self, program_name: str, focus_areas: List[str]) -> str:
        if not self.pipe:
            self.load_model()
            
        # TinyLlama Chat Format
        prompt = f"<|system|>\nYou are a professional academic vision generator. Write exactly one sentence vision for {program_name} focusing on {', '.join(focus_areas)}.\n<|user|>\nGenerate vision starting with 'To be recognized as'.\n<|assistant|>\n"
        
        outputs = self.pipe(prompt)
        generated_text = outputs[0]["generated_text"]
        
        # Extract assistant response
        if "<|assistant|>" in generated_text:
            vision = generated_text.split("<|assistant|>")[-1].strip()
        else:
            vision = generated_text.replace(prompt, "").strip()
            
        # Clean up
        vision = vision.split("\n")[0].split("<|")[0].strip()
        return vision

# Singleton instance
engine = LocalMLEngine()

def get_local_vision(program_name: str, focus_areas: List[str]) -> str:
    """Entry point for dedicated local vision generation."""
    try:
        return engine.generate_vision(program_name, focus_areas)
    except Exception as e:
        print(f"ERROR in Local ML: {str(e)}")
        return ""
