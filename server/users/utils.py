def merge_err_dicts(err_dict1: dict[str, list], err_dict2: dict[str, list]):
    """
    Utils for merging a dictionary of errors in order to provide better feedback on user input.
    """
    res = {}
    for key, val in err_dict1.items():
        if key not in err_dict2:
            res[key] = list(val)
        else:
            res[key] = val + err_dict2[key]

    for key, val in err_dict2.items():
        if key not in err_dict1:
            res[key] = list(val)

    return res
