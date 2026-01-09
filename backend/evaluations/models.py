from django.db import models


class Evaluation(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	joint_type = models.CharField(max_length=64, default="butt_joint")
	score = models.IntegerField()
	grade = models.CharField(max_length=32, blank=True, default="")
	captured_at = models.FloatField(null=True, blank=True)
	metrics = models.JSONField(default=dict, blank=True)

	def __str__(self) -> str:
		return f"{self.joint_type} score={self.score}"
