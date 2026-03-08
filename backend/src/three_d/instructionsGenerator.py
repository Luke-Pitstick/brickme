def chunk_list(items, chunk_size):
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]


def generate_instruction_steps(piece_list, pieces_per_step=6):

    ordered_pieces = sorted(piece_list, key=lambda brick: brick.z)

    steps = []
    built_so_far = []
    step_number = 1

    for chunk in chunk_list(ordered_pieces, pieces_per_step):
        built_so_far.extend(chunk)

        steps.append({
            "step_number": step_number,
            "current_step_bricks": list(chunk),
            "all_bricks_so_far": list(built_so_far),
        })

        step_number += 1

    return steps