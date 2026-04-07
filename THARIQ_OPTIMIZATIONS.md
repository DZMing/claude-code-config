# Thariq优化集成

## TrueSkill排序

使用`opportunity_ranker.py`进行大规模语义排序：

```bash
python3 ~/.claude/opportunity_ranker.py <data.json>
```

## 用户偏好

配置文件：`~/.claude/user_preferences.json`

- 全中文输出
- 零确认执行
- 精度优先
- AWS Code风格

## 参考

- TrueSkill算法：https://thariq.io/blog/sorting/
- 可解释性：https://thariq.io/blog/interpretability/
